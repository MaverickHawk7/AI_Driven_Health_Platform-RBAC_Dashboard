/**
 * reportGenerator.ts
 * Generates district-level reports from screening, intervention, and patient data.
 */

import { storage } from "../storage";
import type { DistrictReport } from "@shared/schema";

/**
 * Generate a district report for a given date range.
 */
export async function generateDistrictReport(from?: string, to?: string): Promise<DistrictReport> {
  const fromDate = from ? new Date(from) : new Date(0);
  const toDate = to ? new Date(to) : new Date();

  const allPatients = await storage.getPatients();
  const allScreenings = await storage.getScreenings();
  const allInterventionPlans = await storage.getInterventionPlans();
  const allUsers = await storage.getAllUsers();

  // Filter screenings by date range
  const periodScreenings = allScreenings.filter(s => {
    if (!s.date) return false;
    const d = new Date(s.date).getTime();
    return d >= fromDate.getTime() && d <= toDate.getTime();
  });

  // New registrations in period
  const newRegistrations = allPatients.filter(p => {
    if (!p.createdAt) return false;
    const d = new Date(p.createdAt).getTime();
    return d >= fromDate.getTime() && d <= toDate.getTime();
  }).length;

  // Risk distribution from period screenings
  const high = periodScreenings.filter(s => s.riskLevel === "High").length;
  const medium = periodScreenings.filter(s => s.riskLevel === "Medium").length;
  const low = periodScreenings.filter(s => s.riskLevel === "Low").length;

  // Follow-up completion rate: patients with baseline + at least one reassessment
  const patientsWithBaseline = new Set(
    allScreenings.filter(s => s.screeningType === "baseline").map(s => s.patientId)
  );
  const patientsWithFollowUp = new Set(
    allScreenings.filter(s => s.screeningType && s.screeningType !== "baseline").map(s => s.patientId)
  );
  const followUpNeeded = Array.from(patientsWithBaseline).filter(pid => {
    const latest = allScreenings.filter(s => s.patientId === pid).sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))[0];
    return latest?.riskLevel !== "Low";
  });
  const followUpCompletionRate = followUpNeeded.length > 0
    ? Math.round((followUpNeeded.filter(pid => patientsWithFollowUp.has(pid)).length / followUpNeeded.length) * 100)
    : 100;

  // Intervention adherence: active/completed plans vs total plans
  const activePlans = allInterventionPlans.filter((p: any) => p.status === "active" || p.status === "completed");
  const interventionAdherenceRate = allInterventionPlans.length > 0
    ? Math.round((activePlans.length / allInterventionPlans.length) * 100)
    : 0;

  // Worker performance
  const fieldWorkers = allUsers.filter(u => u.role === "field_worker" || u.role === "supervisor");
  const workerPerformance = fieldWorkers.map(worker => {
    const workerScreenings = periodScreenings.filter(s => s.conductedByUserId === worker.id);
    const workerPatients = new Set(workerScreenings.map(s => s.patientId));
    const avgRiskScore = workerScreenings.length > 0
      ? Math.round(workerScreenings.reduce((sum, s) => sum + (s.riskScore ?? 0), 0) / workerScreenings.length)
      : 0;

    return {
      userId: worker.id,
      userName: worker.name,
      screeningsCount: workerScreenings.length,
      patientsCount: workerPatients.size,
      avgRiskScore,
    };
  });

  // Intervention effectiveness
  const completedPlans = allInterventionPlans.filter((p: any) => p.status === "completed");
  let avgImprovementIndex = 0;
  let improvementCount = 0;

  for (const patient of allPatients) {
    const patientScreenings = allScreenings
      .filter(s => s.patientId === patient.id)
      .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));

    if (patientScreenings.length < 2) continue;

    const baseline = patientScreenings[0];
    const latest = patientScreenings[patientScreenings.length - 1];
    const baseScore = baseline.riskScore ?? 0;
    const currentScore = latest.riskScore ?? 0;

    if (baseScore > 0) {
      avgImprovementIndex += ((baseScore - currentScore) / baseScore) * 100;
      improvementCount++;
    }
  }

  avgImprovementIndex = improvementCount > 0 ? Math.round(avgImprovementIndex / improvementCount) : 0;

  // Monthly risk trends
  const monthlyMap = new Map<string, { high: number; medium: number; low: number }>();
  for (const s of periodScreenings) {
    if (!s.date) continue;
    const d = new Date(s.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyMap.has(key)) monthlyMap.set(key, { high: 0, medium: 0, low: 0 });
    const entry = monthlyMap.get(key)!;
    if (s.riskLevel === "High") entry.high++;
    else if (s.riskLevel === "Medium") entry.medium++;
    else entry.low++;
  }

  const riskTrends = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, counts]) => ({ month, ...counts }));

  return {
    period: { from: fromDate.toISOString().slice(0, 10), to: toDate.toISOString().slice(0, 10) },
    summary: {
      totalPatients: allPatients.length,
      totalScreenings: periodScreenings.length,
      newRegistrations,
      riskDistribution: { low, medium, high },
      followUpCompletionRate,
      interventionAdherenceRate,
    },
    workerPerformance,
    interventionEffectiveness: {
      totalPlans: allInterventionPlans.length,
      activePlans: activePlans.length,
      completedPlans: completedPlans.length,
      avgImprovementIndex,
    },
    riskTrends,
  };
}

/**
 * Convert a district report to CSV format.
 */
export function reportToCSV(report: DistrictReport): string {
  const lines: string[] = [];

  // Summary section
  lines.push("Section,Metric,Value");
  lines.push(`Summary,Period,${report.period.from} to ${report.period.to}`);
  lines.push(`Summary,Total Patients,${report.summary.totalPatients}`);
  lines.push(`Summary,Total Screenings,${report.summary.totalScreenings}`);
  lines.push(`Summary,New Registrations,${report.summary.newRegistrations}`);
  lines.push(`Summary,High Risk Count,${report.summary.riskDistribution.high}`);
  lines.push(`Summary,Medium Risk Count,${report.summary.riskDistribution.medium}`);
  lines.push(`Summary,Low Risk Count,${report.summary.riskDistribution.low}`);
  lines.push(`Summary,Follow-up Completion Rate,${report.summary.followUpCompletionRate}%`);
  lines.push(`Summary,Intervention Adherence Rate,${report.summary.interventionAdherenceRate}%`);
  lines.push("");

  // Worker performance
  lines.push("Worker Name,Screenings,Patients,Avg Risk Score");
  for (const w of report.workerPerformance) {
    lines.push(`${w.userName},${w.screeningsCount},${w.patientsCount},${w.avgRiskScore}`);
  }
  lines.push("");

  // Intervention effectiveness
  lines.push("Intervention Metric,Value");
  lines.push(`Total Plans,${report.interventionEffectiveness.totalPlans}`);
  lines.push(`Active Plans,${report.interventionEffectiveness.activePlans}`);
  lines.push(`Completed Plans,${report.interventionEffectiveness.completedPlans}`);
  lines.push(`Avg Improvement Index,${report.interventionEffectiveness.avgImprovementIndex}%`);
  lines.push("");

  // Risk trends
  lines.push("Month,High,Medium,Low");
  for (const t of report.riskTrends) {
    lines.push(`${t.month},${t.high},${t.medium},${t.low}`);
  }

  return lines.join("\n");
}
