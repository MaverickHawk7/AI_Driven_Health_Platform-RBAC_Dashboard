
import { storage } from "../storage";
import type { InsertAlert } from "@shared/schema";

interface AlertContext {
  patientId?: number;
  screeningId?: number;
  riskLevel?: string;
  riskScore?: number;
}


export async function evaluateAlertTriggers(context: AlertContext): Promise<number> {
  let alertsCreated = 0;

  try {
    if (context.patientId && context.riskLevel === "High") {
      alertsCreated += await checkHighRiskDetected(context);
    }

    if (context.patientId) {
      alertsCreated += await checkNoImprovement(context);
      alertsCreated += await checkSupervisorEscalation(context);
    }

    // Check missed follow-ups for all patients (batch)
    alertsCreated += await checkMissedFollowups();

  } catch (err) {
    console.error("[alertEngine] Error evaluating triggers:", err);
  }

  return alertsCreated;
}


async function checkHighRiskDetected(context: AlertContext): Promise<number> {
  if (!context.patientId || context.riskLevel !== "High") return 0;

  //  check if active alert already exists for this patient
  const existing = await storage.getActiveAlertsForPatient(context.patientId);
  const hasDuplicate = existing.some(a => a.type === "high_risk_detected");
  if (hasDuplicate) return 0;

  const patient = await storage.getPatient(context.patientId);
  const patientName = patient?.name || `Patient #${context.patientId}`;

  await storage.createAlert({
    type: "high_risk_detected",
    severity: "critical",
    title: `High Risk: ${patientName}`,
    message: `${patientName} scored ${context.riskScore ?? "N/A"}/100 on their latest screening. Immediate specialist referral recommended.`,
    patientId: context.patientId,
    screeningId: context.screeningId ?? null,
    status: "active",
  });

  return 1;
}


async function checkNoImprovement(context: AlertContext): Promise<number> {
  if (!context.patientId) return 0;

  const screenings = await storage.getScreenings(context.patientId);
  if (screenings.length < 2) return 0;

  const current = screenings[0]; // most recent (sorted desc)
  const previous = screenings[1];

  if (current.riskLevel === "Low" || previous.riskLevel === "Low") return 0;
  if ((current.riskScore ?? 0) < (previous.riskScore ?? 0)) return 0;

  // Deduplicate
  const existing = await storage.getActiveAlertsForPatient(context.patientId);
  const hasDuplicate = existing.some(a => a.type === "no_improvement");
  if (hasDuplicate) return 0;

  const patient = await storage.getPatient(context.patientId);
  const patientName = patient?.name || `Patient #${context.patientId}`;

  await storage.createAlert({
    type: "no_improvement",
    severity: "high",
    title: `No Improvement: ${patientName}`,
    message: `${patientName}'s risk score has not decreased (${previous.riskScore} → ${current.riskScore}). Review intervention plan effectiveness.`,
    patientId: context.patientId,
    screeningId: context.screeningId ?? null,
    status: "active",
  });

  return 1;
}


async function checkSupervisorEscalation(context: AlertContext): Promise<number> {
  if (!context.patientId) return 0;

  const existing = await storage.getActiveAlertsForPatient(context.patientId);
  const criticalCount = existing.filter(a => a.severity === "critical").length;

  if (criticalCount < 2) return 0;

  const hasEscalation = existing.some(a => a.type === "supervisor_escalation");
  if (hasEscalation) return 0;

  const patient = await storage.getPatient(context.patientId);
  const patientName = patient?.name || `Patient #${context.patientId}`;

  await storage.createAlert({
    type: "supervisor_escalation",
    severity: "critical",
    title: `Escalation: ${patientName}`,
    message: `${patientName} has ${criticalCount} active critical alerts. Supervisor review required immediately.`,
    patientId: context.patientId,
    status: "active",
  });

  return 1;
}


async function checkMissedFollowups(): Promise<number> {
  let count = 0;
  const patients = await storage.getPatients();
  const now = Date.now();
  const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;

  for (const patient of patients) {
    const screenings = await storage.getScreenings(patient.id);
    if (screenings.length === 0) continue;

    const latest = screenings[0]; // most recent
    if (latest.riskLevel === "Low") continue;

    const lastDate = latest.date ? new Date(latest.date).getTime() : 0;
    if (now - lastDate < NINETY_DAYS) continue;

    // Deduplicate
    const existing = await storage.getActiveAlertsForPatient(patient.id);
    if (existing.some(a => a.type === "missed_followup")) continue;

    const daysSince = Math.round((now - lastDate) / (24 * 60 * 60 * 1000));

    await storage.createAlert({
      type: "missed_followup",
      severity: "high",
      title: `Missed Follow-up: ${patient.name}`,
      message: `${patient.name} (${latest.riskLevel} risk) has not been screened in ${daysSince} days. Schedule a reassessment.`,
      patientId: patient.id,
      status: "active",
    });

    count++;
  }

  return count;
}
