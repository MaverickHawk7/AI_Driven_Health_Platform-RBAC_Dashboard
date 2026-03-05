import { z } from 'zod';
import {
  insertPatientSchema, insertScreeningSchema, insertUserSchema, insertInterventionSchema,
  insertInterventionPlanSchema, insertActivityLogSchema, insertConsentRecordSchema,
  insertSupervisorCenterAssignmentSchema, insertMessageSchema, insertCenterSchema,
  patients, screenings, interventions, users, interventionPlans, activityLogs, consentRecords, auditLogs,
  alerts, alertThresholds, supervisorCenterAssignments, messages, centers,
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  users: {
    list: {
      method: 'GET' as const,
      path: '/api/users',
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/users/:id',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/users/:id',
      input: z.object({
        role: z.enum(["field_worker", "supervisor", "cdpo", "dwcweo", "higher_official", "admin"]),
        name: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/users/:id',
      responses: {
        200: z.object({ message: z.string() }),
        400: errorSchemas.validation,
        403: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/users',
      input: z.object({
        username: z.string().min(1, "Username is required"),
        password: z.string().min(4, "Password must be at least 4 characters"),
        name: z.string().min(1, "Name is required"),
        role: z.enum(["field_worker", "supervisor", "cdpo", "dwcweo", "higher_official", "admin"]),
      }),
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
        409: errorSchemas.validation,
      },
    },
  },
  fieldWorkers: {
    list: {
      method: 'GET' as const,
      path: '/api/field-workers',
      responses: {
        200: z.array(z.custom<any>()),
      },
    },
  },
  patients: {
    list: {
      method: 'GET' as const,
      path: '/api/patients',
      input: z.object({
        search: z.string().optional(),
        riskLevel: z.enum(['Low', 'Medium', 'High']).optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof patients.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/patients/:id',
      responses: {
        200: z.custom<typeof patients.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/patients',
      input: insertPatientSchema,
      responses: {
        201: z.custom<typeof patients.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/patients/:id',
      input: insertPatientSchema.partial(),
      responses: {
        200: z.custom<typeof patients.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/patients/:id',
      responses: {
        200: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
      },
    },
    progress: {
      method: 'GET' as const,
      path: '/api/patients/:id/progress',
      responses: {
        200: z.custom<any>(),
        404: errorSchemas.notFound,
      },
    },
  },
  screenings: {
    list: {
      method: 'GET' as const,
      path: '/api/screenings',
      input: z.object({
        patientId: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof screenings.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/screenings',
      input: insertScreeningSchema,
      responses: {
        201: z.custom<typeof screenings.$inferSelect & { source: "ai" | "fallback"; explanation: string }>(),
        400: errorSchemas.validation,
      },
    },
  },
  interventions: {
    list: {
      method: 'GET' as const,
      path: '/api/interventions',
      responses: {
        200: z.array(z.custom<typeof interventions.$inferSelect>()),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/interventions/:id',
      input: insertInterventionSchema.partial(),
      responses: {
        200: z.custom<typeof interventions.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  interventionPlans: {
    list: {
      method: 'GET' as const,
      path: '/api/intervention-plans',
      responses: {
        200: z.array(z.custom<typeof interventionPlans.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/intervention-plans/:id',
      responses: {
        200: z.custom<typeof interventionPlans.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    generate: {
      method: 'POST' as const,
      path: '/api/intervention-plans/generate',
      input: z.object({
        patientId: z.number(),
        screeningId: z.number(),
        ageMonths: z.number(),
        riskLevel: z.string(),
        answers: z.record(z.string()),
        domainScores: z.record(z.number()).optional(),
      }),
      responses: {
        201: z.array(z.custom<typeof interventionPlans.$inferSelect>()),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/intervention-plans/:id',
      input: insertInterventionPlanSchema.partial().extend({
        supervisorNotes: z.string().optional(),
        supervisorModifiedByUserId: z.number().optional(),
      }),
      responses: {
        200: z.custom<typeof interventionPlans.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  activityLogs: {
    list: {
      method: 'GET' as const,
      path: '/api/activity-logs',
      responses: {
        200: z.array(z.custom<typeof activityLogs.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/activity-logs',
      input: insertActivityLogSchema,
      responses: {
        201: z.custom<typeof activityLogs.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/activity-logs/:id',
      input: insertActivityLogSchema.partial(),
      responses: {
        200: z.custom<typeof activityLogs.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  consent: {
    list: {
      method: 'GET' as const,
      path: '/api/consent',
      responses: {
        200: z.array(z.custom<typeof consentRecords.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/consent',
      input: insertConsentRecordSchema,
      responses: {
        201: z.custom<typeof consentRecords.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    check: {
      method: 'GET' as const,
      path: '/api/consent/check/:patientId/:type',
      responses: {
        200: z.object({ hasConsent: z.boolean(), record: z.custom<typeof consentRecords.$inferSelect>().optional() }),
      },
    },
    revoke: {
      method: 'POST' as const,
      path: '/api/consent/:id/revoke',
      responses: {
        200: z.custom<typeof consentRecords.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  auditLogs: {
    list: {
      method: 'GET' as const,
      path: '/api/audit-logs',
      responses: {
        200: z.array(z.custom<typeof auditLogs.$inferSelect>()),
      },
    },
  },
  alerts: {
    list: {
      method: 'GET' as const,
      path: '/api/alerts',
      responses: {
        200: z.array(z.custom<typeof alerts.$inferSelect>()),
      },
    },
    counts: {
      method: 'GET' as const,
      path: '/api/alerts/counts',
      responses: {
        200: z.record(z.number()),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/alerts/:id',
      input: z.object({
        status: z.enum(["active", "acknowledged", "resolved", "dismissed"]).optional(),
      }),
      responses: {
        200: z.custom<typeof alerts.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    evaluate: {
      method: 'POST' as const,
      path: '/api/alerts/evaluate',
      input: z.object({
        patientId: z.number().optional(),
        screeningId: z.number().optional(),
      }),
      responses: {
        200: z.object({ alertsCreated: z.number() }),
      },
    },
  },
  alertThresholds: {
    list: {
      method: 'GET' as const,
      path: '/api/alert-thresholds',
      responses: {
        200: z.array(z.custom<typeof alertThresholds.$inferSelect>()),
      },
    },
    upsert: {
      method: 'PUT' as const,
      path: '/api/alert-thresholds',
      input: z.object({
        alertType: z.string(),
        thresholdKey: z.string(),
        thresholdValue: z.string(),
        isActive: z.boolean().optional(),
      }),
      responses: {
        200: z.custom<typeof alertThresholds.$inferSelect>(),
      },
    },
  },
  centers: {
    list: {
      method: 'GET' as const,
      path: '/api/centers',
      responses: {
        200: z.array(z.custom<typeof centers.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/centers/:id',
      responses: {
        200: z.custom<typeof centers.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/centers',
      input: insertCenterSchema,
      responses: {
        201: z.custom<typeof centers.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/centers/:id',
      input: insertCenterSchema.partial(),
      responses: {
        200: z.custom<typeof centers.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  assignments: {
    list: {
      method: 'GET' as const,
      path: '/api/assignments',
      responses: {
        200: z.array(z.custom<typeof supervisorCenterAssignments.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/assignments',
      input: z.object({
        supervisorId: z.number(),
        centerId: z.number(),
      }),
      responses: {
        201: z.custom<typeof supervisorCenterAssignments.$inferSelect>(),
        400: errorSchemas.validation,
        403: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/assignments/:id',
      responses: {
        200: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
      },
    },
  },
  messages: {
    list: {
      method: 'GET' as const,
      path: '/api/messages',
      responses: {
        200: z.array(z.custom<typeof messages.$inferSelect>()),
      },
    },
    sent: {
      method: 'GET' as const,
      path: '/api/messages/sent',
      responses: {
        200: z.array(z.custom<typeof messages.$inferSelect>()),
      },
    },
    unread: {
      method: 'GET' as const,
      path: '/api/messages/unread-count',
      responses: {
        200: z.object({ count: z.number() }),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/messages/:id',
      responses: {
        200: z.custom<typeof messages.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/messages',
      input: z.object({
        recipientId: z.number(),
        type: z.enum(["message", "task"]).default("message"),
        subject: z.string().min(1),
        body: z.string().optional(),
        priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
        dueDate: z.string().optional(),
        relatedPatientId: z.number().optional(),
      }),
      responses: {
        201: z.custom<typeof messages.$inferSelect>(),
        400: errorSchemas.validation,
        403: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/messages/:id',
      input: z.object({
        status: z.enum(["unread", "read", "accepted", "in_progress", "completed", "declined"]),
      }),
      responses: {
        200: z.custom<typeof messages.$inferSelect>(),
        404: errorSchemas.notFound,
        403: errorSchemas.validation,
      },
    },
  },
  reports: {
    district: {
      method: 'GET' as const,
      path: '/api/reports/district',
      responses: {
        200: z.custom<any>(),
      },
    },
    districtCsv: {
      method: 'GET' as const,
      path: '/api/reports/district/csv',
      responses: {
        200: z.string(),
      },
    },
    workerPerformance: {
      method: 'GET' as const,
      path: '/api/reports/worker-performance',
      responses: {
        200: z.array(z.custom<any>()),
      },
    },
  },
  fhir: {
    patients: {
      method: 'GET' as const,
      path: '/api/fhir/Patient',
      responses: {
        200: z.custom<any>(),
      },
    },
    observations: {
      method: 'GET' as const,
      path: '/api/fhir/Observation',
      responses: {
        200: z.custom<any>(),
      },
    },
    carePlans: {
      method: 'GET' as const,
      path: '/api/fhir/CarePlan',
      responses: {
        200: z.custom<any>(),
      },
    },
    bundleAll: {
      method: 'GET' as const,
      path: '/api/fhir/Bundle',
      responses: {
        200: z.custom<any>(),
      },
    },
  },
  photoAnalysis: {
    analyze: {
      method: 'POST' as const,
      path: '/api/analyze-photo',
      input: z.object({
        image: z.string(),
        screeningId: z.number().optional(),
      }),
      responses: {
        200: z.object({
          status: z.enum(["detected", "not_detected", "inconclusive"]),
          confidence: z.number(),
          indicators: z.array(z.string()),
          explanation: z.string(),
          source: z.enum(["yolo", "ai", "fallback"]),
          model: z.string().optional(),
        }),
        400: errorSchemas.validation,
      },
    },
  },
  stats: {
    get: {
      method: 'GET' as const,
      path: '/api/stats',
      responses: {
        200: z.object({
          totalPatients: z.number(),
          highRiskPercentage: z.number(),
          exitHighRiskPercentage: z.number(),
          avgReductionDelayMonths: z.number(),
          patientsByRiskLevel: z.array(z.object({ name: z.string(), value: z.number() })),
          monthlyScreenings: z.array(z.object({ month: z.string(), count: z.number() })),
        }),
      },
    },
    scoped: {
      method: 'GET' as const,
      path: '/api/stats/scoped',
      responses: {
        200: z.custom<any>(),
      },
    },
  },
  // === PREDICTIVE & ANALYTICS ENDPOINTS ===
  prediction: {
    get: {
      method: 'GET' as const,
      path: '/api/patients/:id/prediction',
      responses: {
        200: z.object({
          predictedScore3m: z.number(),
          predictedScore6m: z.number(),
          trajectory: z.enum(["improving", "stable", "worsening"]),
          earlyWarnings: z.array(z.string()),
          confidence: z.number(),
          source: z.enum(["ai", "fallback"]),
        }).nullable(),
      },
    },
  },
  interventionAdjust: {
    adjust: {
      method: 'POST' as const,
      path: '/api/intervention-plans/adjust',
      input: z.object({
        patientId: z.number(),
        screeningId: z.number(),
      }),
      responses: {
        200: z.array(z.custom<any>()),
      },
    },
  },
  analytics: {
    dataQuality: {
      method: 'GET' as const,
      path: '/api/reports/data-quality',
      responses: {
        200: z.array(z.object({
          userId: z.number(),
          name: z.string(),
          completeness: z.number(),
          consentCoverage: z.number(),
          followUpAdherence: z.number(),
          photoCaptureRate: z.number(),
          qualityScore: z.number(),
        })),
      },
    },
    clusterDomains: {
      method: 'GET' as const,
      path: '/api/reports/cluster-domains',
      responses: {
        200: z.array(z.object({
          centerId: z.number(),
          centerName: z.string(),
          avgMotor: z.number(),
          avgSocial: z.number(),
          avgLanguage: z.number(),
          avgNutrition: z.number(),
          avgCognitive: z.number(),
          screeningCount: z.number(),
        })),
      },
    },
    domainHeatmap: {
      method: 'GET' as const,
      path: '/api/reports/domain-heatmap',
      responses: {
        200: z.array(z.object({
          centerId: z.number(),
          centerName: z.string(),
          motor: z.number(),
          social: z.number(),
          language: z.number(),
          nutrition: z.number(),
          cognitive: z.number(),
        })),
      },
    },
    blockTrends: {
      method: 'GET' as const,
      path: '/api/reports/block-trends',
      responses: {
        200: z.array(z.object({
          block: z.string(),
          month: z.string(),
          high: z.number(),
          medium: z.number(),
          low: z.number(),
          total: z.number(),
        })),
      },
    },
    aiPerformance: {
      method: 'GET' as const,
      path: '/api/reports/ai-performance',
      responses: {
        200: z.object({
          aiUsageRate: z.number(),
          fallbackRate: z.number(),
          consistencyScore: z.number(),
          totalScreenings: z.number(),
        }),
      },
    },
    districtComparison: {
      method: 'GET' as const,
      path: '/api/reports/district-comparison',
      responses: {
        200: z.array(z.object({
          district: z.string(),
          totalPatients: z.number(),
          screeningsConducted: z.number(),
          highRiskRate: z.number(),
          recoveryRate: z.number(),
          interventionCompletionRate: z.number(),
          activeWorkers: z.number(),
        })),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
