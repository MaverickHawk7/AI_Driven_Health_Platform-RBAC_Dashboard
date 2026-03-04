/**
 * dynamicRecommender.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Adjusts intervention plan intensity based on new screening data.
 * Compares latest screening with previous to determine if each domain's
 * intervention should be intensified, maintained, or reduced.
 *
 * Public API:
 *   adjustInterventionIntensity(latestDomainScores, previousDomainScores, plans)
 *     → IntensityAdjustment[]
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { DomainScores, IntensityAdjustment } from "@shared/schema";

export interface ActivePlan {
  id: number;
  domain: string;
  status: string;
}

/**
 * Determine intensity adjustment for each active intervention plan
 * based on domain score changes between screenings.
 *
 * Rule-based (no LLM needed — deterministic and fast):
 * - Domain score improved by >10 pts → decrease intensity
 * - Domain score worsened by >10 pts → increase intensity
 * - Otherwise → maintain current intensity
 */
export function adjustInterventionIntensity(
  latestScores: DomainScores | null,
  previousScores: DomainScores | null,
  activePlans: ActivePlan[]
): IntensityAdjustment[] {
  if (!latestScores || !previousScores || activePlans.length === 0) {
    return [];
  }

  const latest = latestScores as unknown as Record<string, number>;
  const previous = previousScores as unknown as Record<string, number>;

  const adjustments: IntensityAdjustment[] = [];

  for (const plan of activePlans) {
    if (plan.status !== "active" && plan.status !== "recommended") continue;

    const domainKey = plan.domain === "speech" ? "language" : plan.domain;
    const latestScore = latest[domainKey] ?? 0;
    const prevScore = previous[domainKey] ?? 0;
    const delta = latestScore - prevScore;

    let newIntensity: string;
    let previousIntensity: string;
    let reason: string;

    // Determine current intensity from score
    previousIntensity = prevScore >= 75 ? "urgent" : prevScore >= 40 ? "moderate" : "maintenance";

    if (delta < -10) {
      // Domain improved significantly
      newIntensity = latestScore >= 75 ? "urgent" : latestScore >= 40 ? "moderate" : "maintenance";
      reason = `${plan.domain} score improved by ${Math.abs(Math.round(delta))} pts (${prevScore} → ${latestScore}). Reducing intensity.`;
    } else if (delta > 10) {
      // Domain worsened significantly
      newIntensity = latestScore >= 75 ? "urgent" : "moderate";
      reason = `${plan.domain} score worsened by ${Math.round(delta)} pts (${prevScore} → ${latestScore}). Increasing intensity.`;
    } else {
      // Minimal change
      newIntensity = previousIntensity;
      reason = `${plan.domain} score stable (${prevScore} → ${latestScore}). Maintaining current intensity.`;
    }

    adjustments.push({
      planId: plan.id,
      domain: plan.domain,
      previousIntensity,
      newIntensity,
      reason,
    });
  }

  return adjustments;
}

/**
 * Get a human-readable intensity label with frequency guidance.
 */
export function getIntensityLabel(intensity: string): string {
  switch (intensity) {
    case "urgent": return "Urgent (daily activities)";
    case "moderate": return "Moderate (3x/week)";
    case "maintenance": return "Maintenance (weekly)";
    default: return intensity;
  }
}

/**
 * Determine intensity level from a domain score.
 */
export function scoreToIntensity(score: number): string {
  if (score >= 75) return "urgent";
  if (score >= 40) return "moderate";
  return "maintenance";
}
