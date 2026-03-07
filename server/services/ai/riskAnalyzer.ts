

import { callLLM } from "./openRouterClient";
import { isOllamaAvailable, callOllamaLLM } from "./ollamaClient";

//  Types

export interface ScreeningQuestion {
  
  id: string;
  
  text: string;
  
  category: "Motor" | "Social" | "Language" | "Nutrition" | string;
}


export type AnswerValue = "yes" | "sometimes" | "no";


export type ScreeningAnswers = Record<string, AnswerValue | string>;


export interface RiskResult {
  
  riskScore: number;
  
  riskLevel: "Low" | "Medium" | "High";
 
  explanation: string;
  
  source: "ai" | "fallback";
}


const SCREENING_QUESTIONS: ScreeningQuestion[] = [
  { id: "q1", text: "Can the patient walk or move unassisted?",              category: "Motor"     },
  { id: "q2", text: "Does the patient respond to their name?",              category: "Social"    },
  { id: "q3", text: "Is the patient maintaining adequate nutrition?",        category: "Nutrition" },
  { id: "q4", text: "Does the patient maintain eye contact during interaction?", category: "Social" },
  { id: "q5", text: "Can the patient communicate basic needs verbally?",     category: "Language"  },
];

// Prompt const.
const SYSTEM_PROMPT = `\
You are a JSON API. You output ONLY raw JSON — never explain, never reason, never use markdown.

Your task: score a patient health screening.

RESPOND WITH EXACTLY THIS JSON FORMAT (nothing else):
{"riskScore":NUMBER,"riskLevel":"LEVEL","explanation":"SHORT_TEXT"}

Where:
- riskScore = integer 0–100
- riskLevel = "Low" (0–40) or "Medium" (41–74) or "High" (75–100)
- explanation = max 15 words

Scoring:
- Each "no" = 20 pts, "sometimes" = 8 pts, "yes" = 0 pts
- Social and Language domains get 1.5x multiplier
- Sum all points → riskScore (cap at 100)
- All "yes" → score 0, Low. All "no" → score 100, High.`;

function buildUserMessage(
  questions: ScreeningQuestion[],
  answers: ScreeningAnswers
): string {
  const lines = questions.map((q) => {
    const answer = answers[q.id] ?? "not answered";
    return `  • [${q.category}] ${q.text}\n    Answer: ${answer}`;
  });

  return (
    "Please evaluate the following health screening answers for a patient:\n\n" +
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

  // Clamp riskScore defensively to 0–100
  const riskScore = Math.max(0, Math.min(100, Math.round(raw_.riskScore)));

  // Normalise riskLevel; fall back to score-based banding if the model drifts
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

// Rule-based fallback 
function fallbackRiskCalculation(
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
  const userMessage = buildUserMessage(SCREENING_QUESTIONS, answers);

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
  return fallbackRiskCalculation(SCREENING_QUESTIONS, answers);
}
