

import { callLLM } from "./openRouterClient";
import { isOllamaAvailable, callOllamaLLM } from "./ollamaClient";

//  Types

export interface ScreeningQuestion {
  id: string;
  text: string;
  category: string;
  reversed: boolean; // true = "yes" is concerning
}

export type AnswerValue = "yes" | "no" | "sometimes";

export type ScreeningAnswers = Record<string, AnswerValue | string>;

export interface DomainAssessment {
  domain: string;
  status: "At Risk" | "Monitor" | "Normal";
  insight: string;
}

export interface ConditionIndicator {
  condition: string;
  confidence: number; // 0-100 combined (avg of rule-based + AI)
  ruleBasedConfidence: number;
  aiConfidence: number;
  referral: string;
  caregiverMessage: string;
}

export interface BehaviourResult {
  behaviourConcerns: string; // comma-separated
  behaviourScore: number;
  behaviourRiskLevel: "Low" | "Medium" | "High";
}

export interface FormulaScoreResult {
  formulaRiskScore: number;
  formulaRiskCategory: "Low" | "Medium" | "High";
  autismRisk: "Low" | "Moderate" | "High";
  adhdRisk: "Low" | "Moderate" | "High";
  developmentalStatus: string;
}

export interface RiskResult {
  riskScore: number;
  riskLevel: "Low" | "Medium" | "High";
  explanation: string;
  source: "ai" | "fallback";
  domainAssessments?: DomainAssessment[];
  conditionIndicators?: ConditionIndicator[];
}

// Legacy 5-question screening
const LEGACY_QUESTIONS: ScreeningQuestion[] = [
  { id: "q1", text: "Can the patient walk or move unassisted?",              category: "Motor",     reversed: false },
  { id: "q2", text: "Does the patient respond to their name?",              category: "Social",    reversed: false },
  { id: "q3", text: "Is the patient maintaining adequate nutrition?",        category: "Nutrition", reversed: false },
  { id: "q4", text: "Does the patient maintain eye contact during interaction?", category: "Social", reversed: false },
  { id: "q5", text: "Can the patient communicate basic needs verbally?",     category: "Language",  reversed: false },
];

// M-CHAT-R/F Tier 1 questions
const TIER1_QUESTIONS: ScreeningQuestion[] = [
  { id: "t1_q1",  text: "Did the person start walking by 18 months?",                              category: "Communication",      reversed: false },
  { id: "t1_q2",  text: "Is the person able to speak at least a few meaningful words?",             category: "Communication",      reversed: false },
  { id: "t1_q3",  text: "Can the person follow simple instructions?",                              category: "Communication",      reversed: false },
  { id: "t1_q4",  text: "Does the person respond when their name is called?",                      category: "Joint Attention",    reversed: false },
  { id: "t1_q5",  text: "Does the person look at people's faces during interaction?",               category: "Social Interaction", reversed: false },
  { id: "t1_q6",  text: "Does the person smile back when someone smiles at them?",                  category: "Social Interaction", reversed: false },
  { id: "t1_q7",  text: "Does the person point to ask for something?",                              category: "Joint Attention",    reversed: false },
  { id: "t1_q8",  text: "Does the person point to show something interesting?",                     category: "Joint Attention",    reversed: false },
  { id: "t1_q9",  text: "Does the person use gestures such as waving or nodding?",                  category: "Communication",      reversed: false },
  { id: "t1_q10", text: "Does the person play pretend games?",                                      category: "Play Behavior",      reversed: false },
  { id: "t1_q11", text: "Does the person play with other children?",                                category: "Social Interaction", reversed: false },
  { id: "t1_q12", text: "Does the person bring toys or objects to show adults?",                     category: "Joint Attention",    reversed: false },
  { id: "t1_q13", text: "Does the person repeat movements such as hand flapping or spinning?",      category: "Repetitive Behavior", reversed: true },
  { id: "t1_q14", text: "Does the person become very upset if routines change?",                     category: "Repetitive Behavior", reversed: true },
  { id: "t1_q15", text: "Is the person very sensitive to loud sounds or certain textures?",          category: "Sensory Sensitivity", reversed: true },
];

// M-CHAT-R/F Tier 2 questions
const TIER2_QUESTIONS: ScreeningQuestion[] = [
  { id: "t2_q1",  text: "Does the person repeat the same words or phrases frequently?",             category: "Repetitive Behavior",  reversed: true },
  { id: "t2_q2",  text: "Does the person pull an adult's hand instead of speaking or gesturing?",   category: "Communication",        reversed: true },
  { id: "t2_q3",  text: "Does the person prefer playing alone most of the time?",                   category: "Social Interaction",   reversed: true },
  { id: "t2_q4",  text: "Does the person avoid eye contact frequently?",                            category: "Social Interaction",   reversed: true },
  { id: "t2_q5",  text: "Does the person show little interest in other children?",                  category: "Social Interaction",   reversed: true },
  { id: "t2_q6",  text: "Does the person line up toys or objects repeatedly?",                       category: "Repetitive Behavior",  reversed: true },
  { id: "t2_q7",  text: "Does the person spin objects repeatedly?",                                  category: "Repetitive Behavior",  reversed: true },
  { id: "t2_q8",  text: "Does the person cover their ears in response to normal sounds?",            category: "Sensory Sensitivity",  reversed: true },
  { id: "t2_q9",  text: "Does the person avoid certain food or clothing textures?",                  category: "Sensory Sensitivity",  reversed: true },
  { id: "t2_q10", text: "Does the person have frequent intense tantrums?",                           category: "Emotional Regulation", reversed: true },
  { id: "t2_q11", text: "Does the person struggle to calm down once upset?",                         category: "Emotional Regulation", reversed: true },
  { id: "t2_q12", text: "Does the person focus intensely on a single object for long periods?",      category: "Repetitive Behavior",  reversed: true },
];

// Prompt for AI analysis
const SYSTEM_PROMPT = `\
You are a JSON API. You output ONLY raw JSON — never explain, never reason, never use markdown.

Your task: score a developmental screening based on M-CHAT-R/F methodology, providing both an overall score AND per-domain combined assessments.

IMPORTANT: Questions are grouped by domain (e.g., Communication, Social Interaction). Multiple questions may test the same domain across Tier 1 and Tier 2. You MUST analyze ALL answers within a domain TOGETHER and provide ONE combined assessment per domain. If Tier 1 flags a concern but Tier 2 clears it, the domain should be "Monitor" not "At Risk".

RESPOND WITH EXACTLY THIS JSON FORMAT (nothing else):
{"riskScore":NUMBER,"riskLevel":"LEVEL","explanation":"SHORT_TEXT","domainAssessments":[{"domain":"NAME","status":"STATUS","insight":"TEXT"}]}

Where:
- riskScore = integer 0-100
- riskLevel = "Low" (0-40) or "Medium" (41-74) or "High" (75-100)
- explanation = max 20 words summarizing key concerns
- domainAssessments = one entry per domain present in the screening:
  - domain = exact domain name (Communication, Social Interaction, Joint Attention, Play Behavior, Repetitive Behavior, Sensory Sensitivity, Emotional Regulation)
  - status = "At Risk" (majority concerning), "Monitor" (mixed results), or "Normal" (no concerns)
  - insight = max 15 words explaining the combined finding for this domain

Scoring methodology:
- Count "concerning" answers (for positive behavior questions: "no" is concerning; for negative behavior questions like repetitive movements or sensory sensitivity: "yes" is concerning)
- Tier 1 only (no Tier 2 present): score = (concerning_count / 15) * 100
- Tier 1 + Tier 2: score = (total_concerning / total_questions) * 100
- Weight Social Interaction and Joint Attention domains at 1.3x
- All normal → score 0, Low. All concerning → score 100, High.`;

function buildUserMessage(
  questions: ScreeningQuestion[],
  answers: ScreeningAnswers
): string {
  const lines = questions.map((q) => {
    const answer = answers[q.id] ?? "not answered";
    const reverseNote = q.reversed ? " [reversed: yes=concerning]" : "";
    return `  - [${q.category}${reverseNote}] ${q.text}\n    Answer: ${answer}`;
  });

  return (
    "Please evaluate the following developmental screening answers:\n\n" +
    lines.join("\n\n")
  );
}

// Response parser
function parseRiskResult(raw: string): RiskResult {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[^{}]*"riskScore"\s*:\s*\d+[^{}]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch { }
    }
    if (!parsed) {
      throw new Error(`AI returned non-JSON content: "${cleaned.slice(0, 200)}"`);
    }
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).riskScore !== "number" ||
    typeof (parsed as Record<string, unknown>).riskLevel !== "string" ||
    typeof (parsed as Record<string, unknown>).explanation !== "string"
  ) {
    throw new Error(
      `AI response has unexpected shape: "${cleaned.slice(0, 200)}"`
    );
  }

  const raw_ = parsed as { riskScore: number; riskLevel: string; explanation: string; domainAssessments?: unknown[] };
  const riskScore = Math.max(0, Math.min(100, Math.round(raw_.riskScore)));

  let riskLevel: RiskResult["riskLevel"];
  const lvl = raw_.riskLevel.trim();
  if (lvl === "Low" || lvl === "Medium" || lvl === "High") {
    riskLevel = lvl;
  } else if (riskScore >= 75) {
    riskLevel = "High";
  } else if (riskScore >= 41) {
    riskLevel = "Medium";
  } else {
    riskLevel = "Low";
  }

  // Parse domain assessments if present
  let domainAssessments: DomainAssessment[] | undefined;
  if (Array.isArray(raw_.domainAssessments) && raw_.domainAssessments.length > 0) {
    const validStatuses = new Set(["At Risk", "Monitor", "Normal"]);
    domainAssessments = raw_.domainAssessments
      .filter((d: any) => d && typeof d.domain === "string" && typeof d.status === "string")
      .map((d: any) => ({
        domain: d.domain,
        status: validStatuses.has(d.status) ? d.status : "Monitor",
        insight: typeof d.insight === "string" ? d.insight.slice(0, 200) : "",
      })) as DomainAssessment[];
    if (domainAssessments.length === 0) domainAssessments = undefined;
  }

  return {
    riskScore,
    riskLevel,
    explanation: raw_.explanation.slice(0, 300),
    domainAssessments,
    source: "ai" as const,
  };
}

// Rule-based fallback for new M-CHAT-R/F format
function mchatFallbackRisk(
  questions: ScreeningQuestion[],
  answers: ScreeningAnswers
): RiskResult {
  const HIGH_WEIGHT_DOMAINS = new Set(["Social Interaction", "Joint Attention"]);
  let totalWeight = 0;
  let concerningWeight = 0;

  for (const q of questions) {
    const answer = (answers[q.id] ?? "").toLowerCase();
    if (!answer) continue;
    const weight = HIGH_WEIGHT_DOMAINS.has(q.category) ? 1.3 : 1.0;
    totalWeight += weight;
    const concerning = q.reversed ? (answer === "yes") : (answer === "no");
    if (concerning) {
      concerningWeight += weight;
    }
  }

  const riskScore = totalWeight > 0
    ? Math.max(0, Math.min(100, Math.round((concerningWeight / totalWeight) * 100)))
    : 0;

  const riskLevel: RiskResult["riskLevel"] =
    riskScore >= 75 ? "High" : riskScore >= 41 ? "Medium" : "Low";

  const concernCount = questions.filter(q => {
    const a = (answers[q.id] ?? "").toLowerCase();
    return q.reversed ? a === "yes" : a === "no";
  }).length;

  return {
    riskScore,
    riskLevel,
    explanation: `${concernCount} of ${questions.length} items flagged via rule-based analysis.`,
    source: "fallback" as const,
  };
}

// Legacy fallback for old q1-q5 format
function legacyFallbackRisk(
  questions: ScreeningQuestion[],
  answers: ScreeningAnswers
): RiskResult {
  const HIGH_WEIGHT_DOMAINS = new Set(["Social", "Language"]);
  let rawScore = 0;

  for (const q of questions) {
    const answer = (answers[q.id] ?? "yes").toLowerCase();
    const domainMultiplier = HIGH_WEIGHT_DOMAINS.has(q.category) ? 1.5 : 1.0;

    if (answer === "no") {
      rawScore += 20 * domainMultiplier;
    } else if (answer === "sometimes") {
      rawScore += 8 * domainMultiplier;
    }
  }

  const riskScore = Math.max(0, Math.min(100, Math.round(rawScore)));
  const riskLevel: RiskResult["riskLevel"] =
    riskScore >= 75 ? "High" : riskScore >= 41 ? "Medium" : "Low";

  return {
    riskScore,
    riskLevel,
    explanation: "Risk computed via rule-based fallback (AI service unavailable).",
    source: "fallback" as const,
  };
}


// ── Rule-based pattern detection ─────────────────────────────────────────

interface DomainScoreMap {
  communication: number;
  socialInteraction: number;
  jointAttention: number;
  playBehavior: number;
  repetitiveBehavior: number;
  sensorySensitivity: number;
  emotionalRegulation: number;
}

function computeDomainConcernRatios(
  questions: ScreeningQuestion[],
  answers: ScreeningAnswers
): DomainScoreMap {
  const domainKey: Record<string, keyof DomainScoreMap> = {
    "Communication": "communication",
    "Social Interaction": "socialInteraction",
    "Joint Attention": "jointAttention",
    "Play Behavior": "playBehavior",
    "Repetitive Behavior": "repetitiveBehavior",
    "Sensory Sensitivity": "sensorySensitivity",
    "Emotional Regulation": "emotionalRegulation",
  };

  const counts: Record<keyof DomainScoreMap, { total: number; concerning: number }> = {
    communication: { total: 0, concerning: 0 },
    socialInteraction: { total: 0, concerning: 0 },
    jointAttention: { total: 0, concerning: 0 },
    playBehavior: { total: 0, concerning: 0 },
    repetitiveBehavior: { total: 0, concerning: 0 },
    sensorySensitivity: { total: 0, concerning: 0 },
    emotionalRegulation: { total: 0, concerning: 0 },
  };

  for (const q of questions) {
    const answer = (answers[q.id] ?? "").toLowerCase();
    if (!answer) continue;
    const key = domainKey[q.category];
    if (!key) continue;
    counts[key].total++;
    const concerning = q.reversed ? (answer === "yes") : (answer === "no");
    if (concerning) counts[key].concerning++;
  }

  const result = {} as DomainScoreMap;
  for (const [key, { total, concerning }] of Object.entries(counts)) {
    (result as any)[key] = total > 0 ? Math.round((concerning / total) * 100) : 0;
  }
  return result;
}

const CONDITION_REFERRALS: Record<string, { referral: string; caregiverMessage: string }> = {
  "Autism Spectrum Indicators": {
    referral: "Developmental Pediatrician or District Early Intervention Center (DEIC). RBSK team evaluation recommended within 2 weeks.",
    caregiverMessage: "Your child's screening shows some areas that need a specialist's attention. This is not a diagnosis — it means we want to check further so your child gets the best support early. Please visit the referred center.",
  },
  "Speech/Language Delay": {
    referral: "Speech-Language Pathologist. ENT evaluation to rule out hearing impairment. Reassess in 4-6 weeks.",
    caregiverMessage: "Your child may need some extra help with talking and understanding words. A speech specialist can guide you with simple activities. This is very common and early help makes a big difference.",
  },
  "Global Developmental Delay": {
    referral: "Developmental Pediatrician for comprehensive assessment. District Hospital Pediatrics department.",
    caregiverMessage: "Your child may need a little more time to reach some milestones. A doctor can check and suggest activities to help. Many children catch up well with early support.",
  },
  "Sensory Processing Concerns": {
    referral: "Occupational Therapist for sensory evaluation. Pediatric neurology if severe.",
    caregiverMessage: "Your child seems very sensitive to certain sounds or textures. A specialist can help you understand what bothers your child and how to make things more comfortable.",
  },
  "Behavioral/Emotional Concerns": {
    referral: "Child Psychologist or Behavioral Therapist. PHC referral for further evaluation.",
    caregiverMessage: "Your child may have big emotions that are hard to manage. This is something that can be helped with the right guidance. A specialist can show you calming techniques.",
  },
  "ADHD Indicators": {
    referral: "Developmental Pediatrician or Child Psychologist for ADHD evaluation. PHC referral recommended within 4 weeks.",
    caregiverMessage: "Your child may have difficulty focusing or sitting still. This is common and can be helped with the right support. A specialist can guide you with strategies.",
  },
};

function ruleBasedPatternDetection(
  questions: ScreeningQuestion[],
  answers: ScreeningAnswers
): ConditionIndicator[] {
  const d = computeDomainConcernRatios(questions, answers);
  const indicators: ConditionIndicator[] = [];

  // Autism: Joint Attention + Social Interaction + Repetitive Behavior cluster
  const autismScore = Math.round(
    (d.jointAttention * 0.35) + (d.socialInteraction * 0.30) +
    (d.repetitiveBehavior * 0.20) + (d.communication * 0.10) +
    (d.sensorySensitivity * 0.05)
  );
  if (autismScore >= 30) {
    const ref = CONDITION_REFERRALS["Autism Spectrum Indicators"];
    indicators.push({
      condition: "Autism Spectrum Indicators",
      ruleBasedConfidence: Math.min(100, autismScore),
      aiConfidence: 0,
      confidence: 0,
      ...ref,
    });
  }

  // Speech/Language Delay: Communication high, Social normal
  if (d.communication >= 50 && d.socialInteraction < 40 && d.jointAttention < 50) {
    const score = Math.round(d.communication * 0.7 + (100 - d.socialInteraction) * 0.15 + (100 - d.jointAttention) * 0.15);
    const ref = CONDITION_REFERRALS["Speech/Language Delay"];
    indicators.push({
      condition: "Speech/Language Delay",
      ruleBasedConfidence: Math.min(100, score),
      aiConfidence: 0,
      confidence: 0,
      ...ref,
    });
  }

  // Global Developmental Delay: Multiple domains moderately elevated
  const moderateCount = [d.communication, d.socialInteraction, d.jointAttention, d.playBehavior, d.repetitiveBehavior].filter(s => s >= 40).length;
  if (moderateCount >= 3) {
    const avg = Math.round([d.communication, d.socialInteraction, d.jointAttention, d.playBehavior, d.repetitiveBehavior].reduce((a, b) => a + b, 0) / 5);
    const ref = CONDITION_REFERRALS["Global Developmental Delay"];
    indicators.push({
      condition: "Global Developmental Delay",
      ruleBasedConfidence: Math.min(100, avg),
      aiConfidence: 0,
      confidence: 0,
      ...ref,
    });
  }

  // Sensory Processing: Sensory high, others relatively normal
  if (d.sensorySensitivity >= 60) {
    const ref = CONDITION_REFERRALS["Sensory Processing Concerns"];
    indicators.push({
      condition: "Sensory Processing Concerns",
      ruleBasedConfidence: Math.min(100, d.sensorySensitivity),
      aiConfidence: 0,
      confidence: 0,
      ...ref,
    });
  }

  // Behavioral/Emotional: Emotional Regulation high + Repetitive, Social normal
  if (d.emotionalRegulation >= 50 && d.socialInteraction < 40) {
    const score = Math.round(d.emotionalRegulation * 0.6 + d.repetitiveBehavior * 0.4);
    const ref = CONDITION_REFERRALS["Behavioral/Emotional Concerns"];
    indicators.push({
      condition: "Behavioral/Emotional Concerns",
      ruleBasedConfidence: Math.min(100, score),
      aiConfidence: 0,
      confidence: 0,
      ...ref,
    });
  }

  // ADHD: High emotional regulation + attention concerns, but social interaction relatively intact
  // Uses emotional regulation (difficulty calming, tantrums) + repetitive/focus behavior
  const adhdScore = Math.round(
    (d.emotionalRegulation * 0.40) + (d.repetitiveBehavior * 0.30) +
    (d.communication * 0.15) + (d.sensorySensitivity * 0.15)
  );
  // ADHD pattern: emotional dysregulation + focus issues, but social interest is present
  if (adhdScore >= 35 && d.socialInteraction < 50 && d.emotionalRegulation >= 40) {
    const ref = CONDITION_REFERRALS["ADHD Indicators"];
    indicators.push({
      condition: "ADHD Indicators",
      ruleBasedConfidence: Math.min(100, adhdScore),
      aiConfidence: 0,
      confidence: 0,
      ...ref,
    });
  }

  return indicators;
}

// ── AI condition prompt (second pass) ───────────────────────────────────

const CONDITION_PROMPT = `\
You are a JSON API. You output ONLY raw JSON — never explain, never reason, never use markdown.

Given developmental screening answers, analyze whether the pattern of responses suggests any of these conditions. Consider ALL answers holistically across Tier 1 and Tier 2.

Conditions to evaluate:
1. "Autism Spectrum Indicators" — joint attention + social interaction + repetitive behavior cluster
2. "Speech/Language Delay" — communication concerns with relatively normal social skills
3. "Global Developmental Delay" — broad moderate concerns across many domains
4. "Sensory Processing Concerns" — heightened sensory sensitivity
5. "Behavioral/Emotional Concerns" — emotional dysregulation, behavioral difficulties
6. "ADHD Indicators" — attention/focus difficulties + emotional dysregulation, but social interest preserved

RESPOND WITH EXACTLY THIS JSON (nothing else):
{"conditions":[{"condition":"NAME","confidence":NUMBER,"reasoning":"SHORT_TEXT"}]}

Where:
- condition = exact condition name from the list above
- confidence = 0-100 (how strongly the answers suggest this condition)
- reasoning = max 20 words explaining why

Only include conditions with confidence >= 25. If no conditions are suggested, return {"conditions":[]}.

IMPORTANT: This is a SCREENING indicator, not a diagnosis. Base confidence on the PATTERN of domain responses, not just individual answers.`;

interface AICondition {
  condition: string;
  confidence: number;
  reasoning: string;
}

function parseConditionResult(raw: string): AICondition[] {
  try {
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*"conditions"\s*:\s*\[[\s\S]*\][\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }
    if (!parsed?.conditions || !Array.isArray(parsed.conditions)) return [];
    return parsed.conditions
      .filter((c: any) => c && typeof c.condition === "string" && typeof c.confidence === "number")
      .map((c: any) => ({
        condition: c.condition,
        confidence: Math.max(0, Math.min(100, Math.round(c.confidence))),
        reasoning: typeof c.reasoning === "string" ? c.reasoning.slice(0, 200) : "",
      }));
  } catch {
    console.warn("[riskAnalyzer] Failed to parse AI condition analysis");
    return [];
  }
}

function combineIndicators(
  ruleBased: ConditionIndicator[],
  aiConditions: AICondition[]
): ConditionIndicator[] {
  // Build map of all conditions from both sources
  const conditionMap = new Map<string, ConditionIndicator>();

  // Start with rule-based
  for (const rb of ruleBased) {
    conditionMap.set(rb.condition, { ...rb });
  }

  // Merge AI confidence
  for (const ai of aiConditions) {
    const existing = conditionMap.get(ai.condition);
    if (existing) {
      existing.aiConfidence = ai.confidence;
      existing.confidence = Math.round((existing.ruleBasedConfidence + ai.confidence) / 2);
    } else if (ai.confidence >= 30) {
      // AI found something rule-based didn't
      const ref = CONDITION_REFERRALS[ai.condition];
      if (ref) {
        conditionMap.set(ai.condition, {
          condition: ai.condition,
          ruleBasedConfidence: 0,
          aiConfidence: ai.confidence,
          confidence: Math.round(ai.confidence / 2), // halved since no rule-based support
          ...ref,
        });
      }
    }
  }

  // For rule-based only (AI didn't weigh in), confidence = ruleBasedConfidence * 0.7
  const allIndicators = Array.from(conditionMap.values());
  for (const indicator of allIndicators) {
    if (indicator.aiConfidence === 0 && indicator.ruleBasedConfidence > 0) {
      indicator.confidence = Math.round(indicator.ruleBasedConfidence * 0.7);
    }
  }

  // Filter out low confidence and sort by confidence desc
  return allIndicators
    .filter(c => c.confidence >= 20)
    .sort((a, b) => b.confidence - a.confidence);
}

// Helper: race a promise against a timeout
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// Single AI call: Ollama → OpenRouter, with overall timeout
async function callAI(systemPrompt: string, userMessage: string, timeoutMs: number): Promise<{ content: string; model: string } | null> {
  try {
    return await withTimeout(
      (async () => {
        // Try Ollama first
        try {
          const ollamaReady = await isOllamaAvailable();
          if (ollamaReady) {
            console.log("[riskAnalyzer] Ollama available — using local LLM");
            return await callOllamaLLM(systemPrompt, userMessage);
          }
        } catch (e) {
          console.warn("[riskAnalyzer] Ollama failed:", e);
        }
        // Fallback to OpenRouter
        return await callLLM(systemPrompt, userMessage);
      })(),
      timeoutMs,
      "AI call"
    );
  } catch (err) {
    console.warn("[riskAnalyzer] AI call failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function analyzeScreening(
  answers: ScreeningAnswers
): Promise<RiskResult> {
  // Detect format: new M-CHAT-R/F vs legacy
  const isNewFormat = Object.keys(answers).some(k => k.startsWith("t1_") || k.startsWith("t2_"));

  const questions: ScreeningQuestion[] = isNewFormat
    ? [...TIER1_QUESTIONS, ...TIER2_QUESTIONS].filter(q => answers[q.id] !== undefined)
    : LEGACY_QUESTIONS;

  const userMessage = buildUserMessage(questions, answers);

  let result: RiskResult;
  let aiAvailable = false;

  // 1. Try AI with 20s timeout
  const aiResult = await callAI(SYSTEM_PROMPT, userMessage, 20_000);
  if (aiResult) {
    try {
      result = parseRiskResult(aiResult.content);
      aiAvailable = true;
      console.log(`[riskAnalyzer] AI result via ${aiResult.model}: score=${result.riskScore} level=${result.riskLevel}`);
    } catch (parseErr) {
      console.warn("[riskAnalyzer] AI response parse failed:", parseErr);
    }
  }

  // 2. Deterministic rule-based fallback
  if (!aiAvailable) {
    result = isNewFormat
      ? mchatFallbackRisk(questions, answers)
      : legacyFallbackRisk(LEGACY_QUESTIONS, answers);
  }

  // 3. Pattern detection (only for M-CHAT-R/F format)
  if (isNewFormat) {
    const ruleBasedIndicators = ruleBasedPatternDetection(questions, answers);
    console.log(`[riskAnalyzer] Rule-based pattern detection found ${ruleBasedIndicators.length} indicators`);

    // Second AI pass for condition analysis (shorter timeout — non-critical)
    let aiConditions: AICondition[] = [];
    if (aiAvailable) {
      const conditionResult = await callAI(CONDITION_PROMPT, userMessage, 15_000);
      if (conditionResult) {
        aiConditions = parseConditionResult(conditionResult.content);
        console.log(`[riskAnalyzer] AI condition analysis found ${aiConditions.length} conditions`);
      }
    }

    // Combine rule-based + AI confidence scores
    const conditionIndicators = combineIndicators(ruleBasedIndicators, aiConditions);
    if (conditionIndicators.length > 0) {
      result!.conditionIndicators = conditionIndicators;
      console.log(`[riskAnalyzer] Combined indicators: ${conditionIndicators.map(c => `${c.condition}(${c.confidence}%)`).join(", ")}`);
    }
  }

  return result!;
}

// ── Behaviour scoring ────────────────────────────────────────────────────

const BEHAVIOUR_SCORES: Record<string, number> = {
  sleep: 3,
  aggression: 4,
  feeding: 2,
  tantrums: 3,
  other: 2,
};

export function computeBehaviourScore(concerns: string[]): BehaviourResult {
  let score = 0;
  for (const c of concerns) {
    score += BEHAVIOUR_SCORES[c.toLowerCase()] ?? 2;
  }
  const behaviourRiskLevel: BehaviourResult["behaviourRiskLevel"] =
    score > 10 ? "High" : score >= 6 ? "Medium" : "Low";

  return {
    behaviourConcerns: concerns.join(","),
    behaviourScore: score,
    behaviourRiskLevel,
  };
}

// ── Deterministic formula score ──────────────────────────────────────────

export function computeFormulaScore(opts: {
  domainScores?: Record<string, number> | null;
  conditionIndicators?: ConditionIndicator[] | null;
  behaviourRiskLevel?: string | null;
  nutritionRisk?: string | null;
  environmentRisk?: string | null;
}): FormulaScoreResult {
  let score = 0;

  // Count domain delays (score >= 60 = delay)
  let delayCount = 0;
  if (opts.domainScores) {
    for (const val of Object.values(opts.domainScores)) {
      if (typeof val === "number" && val >= 60) {
        score += 5;
        delayCount++;
      }
    }
  }

  // Autism risk from condition indicators
  let autismRisk: FormulaScoreResult["autismRisk"] = "Low";
  let adhdRisk: FormulaScoreResult["adhdRisk"] = "Low";

  if (opts.conditionIndicators) {
    for (const ci of opts.conditionIndicators) {
      if (ci.condition === "Autism Spectrum Indicators") {
        if (ci.confidence >= 60) { score += 15; autismRisk = "High"; }
        else if (ci.confidence >= 35) { score += 8; autismRisk = "Moderate"; }
      }
      if (ci.condition === "ADHD Indicators") {
        if (ci.confidence >= 60) { score += 8; adhdRisk = "High"; }
        else if (ci.confidence >= 35) { score += 4; adhdRisk = "Moderate"; }
      }
    }
  }

  // Behaviour
  if (opts.behaviourRiskLevel === "High") score += 7;
  else if (opts.behaviourRiskLevel === "Medium") score += 3;

  // Nutrition context bonus
  if (opts.nutritionRisk === "High") score += 3;

  // Environment context bonus
  if (opts.environmentRisk === "High") score += 3;

  const formulaRiskCategory: FormulaScoreResult["formulaRiskCategory"] =
    score > 25 ? "High" : score >= 11 ? "Medium" : "Low";

  const developmentalStatus = delayCount === 0
    ? "No delays identified"
    : `${delayCount} delay${delayCount > 1 ? "s" : ""} identified`;

  return {
    formulaRiskScore: score,
    formulaRiskCategory,
    autismRisk,
    adhdRisk,
    developmentalStatus,
  };
}
