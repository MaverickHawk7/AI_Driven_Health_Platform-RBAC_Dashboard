/**
 * fhirMapper.ts
 * Maps internal data models to FHIR R4 resource format.
 * Reference: https://hl7.org/fhir/R4/
 */

import type { Patient, Screening, InterventionPlan } from "@shared/schema";

// --- FHIR Resource Types ---

interface FHIRResource {
  resourceType: string;
  id: string;
  meta: {
    lastUpdated: string;
    profile?: string[];
  };
}

interface FHIRBundle {
  resourceType: "Bundle";
  type: "collection";
  timestamp: string;
  total: number;
  entry: Array<{ resource: FHIRResource }>;
}

// --- Patient → FHIR Patient ---

export function toFHIRPatient(patient: Patient): FHIRResource {
  const ageYears = Math.floor(patient.ageMonths / 12);
  const ageRemainingMonths = patient.ageMonths % 12;

  return {
    resourceType: "Patient",
    id: patient.uuid,
    meta: {
      lastUpdated: patient.createdAt ? new Date(patient.createdAt).toISOString() : new Date().toISOString(),
      profile: ["http://hl7.org/fhir/StructureDefinition/Patient"],
    },
    identifier: [
      {
        system: "urn:healthtrack:patient:uuid",
        value: patient.uuid,
      },
    ],
    name: [
      {
        use: "official",
        text: patient.name,
      },
    ],
    birthDate: estimateBirthDate(patient.ageMonths),
    contact: patient.caregiverName
      ? [
          {
            relationship: [
              {
                coding: [
                  {
                    system: "http://terminology.hl7.org/CodeSystem/v2-0131",
                    code: "CP",
                    display: "Contact Person",
                  },
                ],
              },
            ],
            name: { text: patient.caregiverName },
            ...(patient.contactNumber
              ? {
                  telecom: [
                    {
                      system: "phone",
                      value: patient.contactNumber,
                      use: "mobile",
                    },
                  ],
                }
              : {}),
          },
        ]
      : [],
    address: patient.address
      ? [{ use: "home", text: patient.address }]
      : [],
    extension: [
      {
        url: "urn:healthtrack:ageMonths",
        valueInteger: patient.ageMonths,
      },
    ],
  } as any;
}

// --- Screening → FHIR Observation ---

export function toFHIRObservation(
  screening: Screening,
  patientUuid: string
): FHIRResource {
  const domainScores = screening.domainScores as Record<string, number> | null;

  const components: any[] = [];

  if (domainScores) {
    for (const [domain, score] of Object.entries(domainScores)) {
      components.push({
        code: {
          coding: [
            {
              system: "urn:healthtrack:domain",
              code: domain,
              display: `${domain.charAt(0).toUpperCase() + domain.slice(1)} Domain Score`,
            },
          ],
        },
        valueQuantity: {
          value: score,
          unit: "score",
          system: "urn:healthtrack:scoring",
        },
      });
    }
  }

  return {
    resourceType: "Observation",
    id: `screening-${screening.id}`,
    meta: {
      lastUpdated: screening.createdAt
        ? new Date(screening.createdAt).toISOString()
        : new Date().toISOString(),
      profile: ["http://hl7.org/fhir/StructureDefinition/Observation"],
    },
    status: "final",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "survey",
            display: "Survey",
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: "urn:healthtrack:screening",
          code: screening.screeningType || "baseline",
          display: `Developmental Screening (${screening.screeningType || "baseline"})`,
        },
      ],
    },
    subject: {
      reference: `Patient/${patientUuid}`,
    },
    effectiveDateTime: screening.date
      ? new Date(screening.date).toISOString()
      : undefined,
    valueQuantity: screening.riskScore != null
      ? {
          value: screening.riskScore,
          unit: "score",
          system: "urn:healthtrack:risk-scoring",
        }
      : undefined,
    interpretation: screening.riskLevel
      ? [
          {
            coding: [
              {
                system: "urn:healthtrack:risk-level",
                code: screening.riskLevel.toLowerCase(),
                display: screening.riskLevel,
              },
            ],
          },
        ]
      : [],
    component: components.length > 0 ? components : undefined,
  } as any;
}

// --- InterventionPlan → FHIR CarePlan ---

export function toFHIRCarePlan(
  plan: InterventionPlan,
  patientUuid: string
): FHIRResource {
  const activities = (plan.activities as any[]) || [];

  return {
    resourceType: "CarePlan",
    id: `careplan-${plan.id}`,
    meta: {
      lastUpdated: plan.updatedAt
        ? new Date(plan.updatedAt).toISOString()
        : new Date().toISOString(),
      profile: ["http://hl7.org/fhir/StructureDefinition/CarePlan"],
    },
    status: mapPlanStatusToFHIR(plan.status),
    intent: "plan",
    category: [
      {
        coding: [
          {
            system: "urn:healthtrack:intervention-domain",
            code: plan.domain,
            display: `${plan.domain.charAt(0).toUpperCase() + plan.domain.slice(1)} Intervention`,
          },
        ],
      },
    ],
    subject: {
      reference: `Patient/${patientUuid}`,
    },
    period: {
      start: plan.createdAt
        ? new Date(plan.createdAt).toISOString()
        : undefined,
    },
    activity: activities.map((act: any) => ({
      detail: {
        kind: "ServiceRequest",
        code: {
          text: act.title || "Activity",
        },
        description: act.description || undefined,
        status: plan.status === "completed" ? "completed" : "in-progress",
        scheduledString: act.frequency
          ? `${act.frequency}${act.duration ? `, ${act.duration}` : ""}`
          : undefined,
      },
    })),
    note: plan.supervisorNotes
      ? [{ text: plan.supervisorNotes }]
      : undefined,
  } as any;
}

// --- Bundle helpers ---

export function toFHIRBundle(resources: FHIRResource[]): FHIRBundle {
  return {
    resourceType: "Bundle",
    type: "collection",
    timestamp: new Date().toISOString(),
    total: resources.length,
    entry: resources.map((resource) => ({ resource })),
  };
}

// --- Utility ---

function estimateBirthDate(ageMonths: number): string {
  const now = new Date();
  now.setMonth(now.getMonth() - ageMonths);
  return now.toISOString().split("T")[0];
}

function mapPlanStatusToFHIR(
  status: string | null
): "draft" | "active" | "completed" | "revoked" {
  switch (status) {
    case "recommended":
      return "draft";
    case "active":
      return "active";
    case "completed":
      return "completed";
    case "discontinued":
      return "revoked";
    default:
      return "draft";
  }
}
