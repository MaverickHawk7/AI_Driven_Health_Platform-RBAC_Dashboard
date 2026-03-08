

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

export interface RiskResult {
  riskScore: number;
  riskLevel: "Low" | "Medium" | "High";
  explanation: string;
  source: "ai" | "fallback";
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

Your task: score a developmental screening based on M-CHAT-R/F methodology.

RESPOND WITH EXACTLY THIS JSON FORMAT (nothing else):
{"riskScore":NUMBER,"riskLevel":"LEVEL","explanation":"SHORT_TEXT"}

Where:
- riskScore = integer 0-100
- riskLevel = "Low" (0-40) or "Medium" (41-74) or "High" (75-100)
- explanation = max 20 words summarizing key concerns

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

  const raw_ = parsed as { riskScore: number; riskLevel: string; explanation: string };
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

  return {
    riskScore,
    riskLevel,
    explanation: raw_.explanation.slice(0, 300),
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


export async function analyzeScreening(
  answers: ScreeningAnswers
): Promise<RiskResult> {
  // Detect format: new M-CHAT-R/F vs legacy
  const isNewFormat = Object.keys(answers).some(k => k.startsWith("t1_") || k.startsWith("t2_"));

  const questions: ScreeningQuestion[] = isNewFormat
    ? [...TIER1_QUESTIONS, ...TIER2_QUESTIONS].filter(q => answers[q.id] !== undefined)
    : LEGACY_QUESTIONS;

  const userMessage = buildUserMessage(questions, answers);

  // 1. Try Ollama (local LLM) first
  try {
    const ollamaReady = await isOllamaAvailable();
    if (ollamaReady) {
      console.log("[riskAnalyzer] Ollama available — using local LLM for analysis");
      const { content, model } = await callOllamaLLM(SYSTEM_PROMPT, userMessage);
      const result = parseRiskResult(content);
      console.log(`[riskAnalyzer] AI result via ${model}: score=${result.riskScore} level=${result.riskLevel}`);
      return result;
    }
    console.log("[riskAnalyzer] Ollama not available, trying OpenRouter...");
  } catch (ollamaErr) {
    console.warn("[riskAnalyzer] Ollama call failed, falling back to OpenRouter:", ollamaErr);
  }

  // 2. Fallback to OpenRouter
  try {
    const { content, model } = await callLLM(SYSTEM_PROMPT, userMessage);
    const result = parseRiskResult(content);
    console.log(`[riskAnalyzer] AI result via ${model}: score=${result.riskScore} level=${result.riskLevel}`);
    return result;
  } catch (openRouterErr) {
    console.warn("[riskAnalyzer] OpenRouter call failed, using rule-based fallback:", openRouterErr);
  }

  // 3. Deterministic rule-based fallback
  if (isNewFormat) {
    return mchatFallbackRisk(questions, answers);
  }
  return legacyFallbackRisk(LEGACY_QUESTIONS, answers);
}
