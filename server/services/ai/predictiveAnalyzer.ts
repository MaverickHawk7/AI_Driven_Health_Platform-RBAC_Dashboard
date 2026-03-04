/**
 * predictiveAnalyzer.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Predicts risk trajectory based on historical screening data.
 * Uses LLM for nuanced prediction with linear regression fallback.
 *
 * Public API:
 *   predictRiskTrajectory(screeningHistory, patientAgeMonths) → Promise<PredictiveResult>
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { callLLM } from "./openRouterClient";
import type { PredictiveResult, DomainScores } from "@shared/schema";

export interface ScreeningHistoryEntry {
  date: string;
  riskScore: number;
  riskLevel: string;
  domainScores?: DomainScores | null;
}

// ── Prompt ────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `\
You are a JSON API. You output ONLY raw JSON — never explain, never reason, never use markdown.

Your task: predict a child's developmental risk trajectory based on screening history.

RESPOND WITH EXACTLY THIS JSON FORMAT (nothing else):
{"predictedScore3m":NUMBER,"predictedScore6m":NUMBER,"trajectory":"TREND","earlyWarnings":["WARNING1"],"confidence":NUMBER}

Where:
- predictedScore3m = predicted risk score (0-100) in 3 months
- predictedScore6m = predicted risk score (0-100) in 6 months
- trajectory = "improving" (scores trending down), "stable" (minimal change), or "worsening" (scores trending up)
- earlyWarnings = array of 0-3 short warning strings about concerning patterns (e.g. "Motor domain declining steadily")
- confidence = 0-100 how confident you are in this prediction

Rules:
- If scores are consistently decreasing, predict further improvement
- If a specific domain is worsening while others improve, flag it as an early warning
- If the child is very young (<12 months), be cautious about predictions
- Consider the rate of change, not just direction
- Lower confidence if fewer data points or erratic scores`;

function buildUserMessage(history: ScreeningHistoryEntry[], ageMonths: number): string {
  const lines = history.map((s, i) => {
    const domains = s.domainScores
      ? ` | Domains: motor=${(s.domainScores as any).motor ?? "?"}, social=${(s.domainScores as any).social ?? "?"}, language=${(s.domainScores as any).language ?? "?"}, nutrition=${(s.domainScores as any).nutrition ?? "?"}, cognitive=${(s.domainScores as any).cognitive ?? "?"}`
      : "";
    return `  ${i + 1}. Date: ${s.date} | Score: ${s.riskScore}/100 (${s.riskLevel})${domains}`;
  });

  return (
    `Patient age: ${ageMonths} months\n` +
    `Number of screenings: ${history.length}\n\n` +
    `Screening history (oldest to newest):\n${lines.join("\n")}\n\n` +
    `Predict this child's risk trajectory for the next 3-6 months.`
  );
}

// ── Response parser ──────────────────────────────────────────────────────────

function parsePrediction(raw: string): Omit<PredictiveResult, "source"> {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[^{}]*"predictedScore3m"\s*:\s*\d+[^{}]*\}/);
    if (jsonMatch) {
      try { parsed = JSON.parse(jsonMatch[0]); } catch { /* fall through */ }
    }
    if (!parsed) throw new Error(`AI returned non-JSON: "${cleaned.slice(0, 200)}"`);
  }

  const p = parsed as Record<string, unknown>;

  const predictedScore3m = Math.max(0, Math.min(100, Math.round(Number(p.predictedScore3m) || 0)));
  const predictedScore6m = Math.max(0, Math.min(100, Math.round(Number(p.predictedScore6m) || 0)));

  let trajectory: PredictiveResult["trajectory"] = "stable";
  if (p.trajectory === "improving" || p.trajectory === "worsening" || p.trajectory === "stable") {
    trajectory = p.trajectory;
  }

  const earlyWarnings: string[] = Array.isArray(p.earlyWarnings)
    ? (p.earlyWarnings as unknown[]).filter((w): w is string => typeof w === "string").slice(0, 3)
    : [];

  const confidence = Math.max(0, Math.min(100, Math.round(Number(p.confidence) || 50)));

  return { predictedScore3m, predictedScore6m, trajectory, earlyWarnings, confidence };
}

// ── Fallback: linear regression ──────────────────────────────────────────────

function fallbackPrediction(history: ScreeningHistoryEntry[]): PredictiveResult {
  if (history.length < 2) {
    const lastScore = history[0]?.riskScore ?? 50;
    return {
      predictedScore3m: lastScore,
      predictedScore6m: lastScore,
      trajectory: "stable",
      earlyWarnings: [],
      confidence: 20,
      source: "fallback",
    };
  }

  // Simple linear regression on scores over time
  const n = history.length;
  const scores = history.map(h => h.riskScore);
  const times = history.map((_, i) => i);

  const sumX = times.reduce((a, b) => a + b, 0);
  const sumY = scores.reduce((a, b) => a + b, 0);
  const sumXY = times.reduce((s, x, i) => s + x * scores[i], 0);
  const sumXX = times.reduce((s, x) => s + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Project forward (assuming ~1 screening per month)
  const predicted3m = Math.max(0, Math.min(100, Math.round(intercept + slope * (n + 3))));
  const predicted6m = Math.max(0, Math.min(100, Math.round(intercept + slope * (n + 6))));

  let trajectory: PredictiveResult["trajectory"] = "stable";
  if (slope < -2) trajectory = "improving";
  else if (slope > 2) trajectory = "worsening";

  // Check domain trends for early warnings
  const earlyWarnings: string[] = [];
  if (history.length >= 2) {
    const first = history[0].domainScores as Record<string, number> | null;
    const last = history[history.length - 1].domainScores as Record<string, number> | null;
    if (first && last) {
      for (const domain of ["motor", "social", "language", "nutrition", "cognitive"]) {
        const delta = (last[domain] ?? 0) - (first[domain] ?? 0);
        if (delta > 15) {
          earlyWarnings.push(`${domain.charAt(0).toUpperCase() + domain.slice(1)} domain worsening (+${Math.round(delta)} pts)`);
        }
      }
    }
  }

  const confidence = Math.min(80, 20 + n * 10);

  return {
    predictedScore3m: predicted3m,
    predictedScore6m: predicted6m,
    trajectory,
    earlyWarnings: earlyWarnings.slice(0, 3),
    confidence,
    source: "fallback",
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function predictRiskTrajectory(
  screeningHistory: ScreeningHistoryEntry[],
  patientAgeMonths: number
): Promise<PredictiveResult> {
  if (screeningHistory.length < 2) {
    return fallbackPrediction(screeningHistory);
  }

  try {
    const userMessage = buildUserMessage(screeningHistory, patientAgeMonths);
    const { content, model } = await callLLM(SYSTEM_PROMPT, userMessage);
    const result = parsePrediction(content);
    console.log(`[predictiveAnalyzer] AI prediction via ${model}: trajectory=${result.trajectory}, 3m=${result.predictedScore3m}, 6m=${result.predictedScore6m}`);
    return { ...result, source: "ai" };
  } catch (err) {
    console.error("[predictiveAnalyzer] AI call failed, using linear regression fallback:", err);
    return fallbackPrediction(screeningHistory);
  }
}
