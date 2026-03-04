

import { callVisionLLM } from "./openRouterClient";
import { isYoloAvailable, analyzeWithYolo, type YoloPredictResponse } from "./yoloClient";

// ── Types ──────────────────────────────────────────────────────────────

export interface PhotoAnalysisResult {
  /** Whether indicators were detected */
  status: "detected" | "not_detected" | "inconclusive";
  /** Confidence level 0-100 */
  confidence: number;
  /** Specific facial indicators observed */
  indicators: string[];
  /** Human-readable explanation */
  explanation: string;
  /** Whether result came from YOLO, cloud AI, or fallback */
  source: "yolo" | "ai" | "fallback";
  /** Which model produced the result */
  model?: string;
}

// ── Prompts ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `\
You are a medical screening assistant integrated into a patient health care and detection program.
Your task is to analyze a photograph of a patient's face for physical indicators commonly associated with Down Syndrome (Trisomy 21).

IMPORTANT DISCLAIMERS (you MUST include in your explanation):
- This is a NON-DIAGNOSTIC screening aid only.
- A definitive diagnosis requires genetic testing (karyotyping).
- Physical features alone are not sufficient for diagnosis.

FACIAL INDICATORS TO EVALUATE:
1. Epicanthal folds (skin folds at inner corners of eyes)
2. Upward slanting palpebral fissures (eyes slanting upward)
3. Flat nasal bridge
4. Small ears or unusual ear shape
5. Protruding tongue or open mouth posture
6. Flat facial profile
7. Short neck
8. Brushfield spots (light-colored spots on iris)

RESPOND WITH EXACTLY THIS JSON FORMAT (no markdown fences, no extra text):
{"status":"STATUS","confidence":NUMBER,"indicators":["INDICATOR1","INDICATOR2"],"explanation":"TEXT"}

Where:
- status = "detected" if 3+ indicators observed, "inconclusive" if 1-2 indicators, "not_detected" if 0
- confidence = integer 0-100 (higher means more certain of the assessment)
- indicators = array of specific indicators observed from the list above (empty array if none)
- explanation = 1-2 sentence clinical summary (max 200 chars), MUST mention non-diagnostic nature`;

const TEXT_PROMPT = `\
Please analyze this photograph of a patient's face for physical indicators commonly associated with Down Syndrome.
Evaluate each known facial indicator and provide your structured assessment as JSON.
If the image is unclear, low quality, or does not show a face, set status to "inconclusive" with an appropriate explanation.`;

// ── Response parser ────────────────────────────────────────────────────

function parsePhotoResult(raw: string, model: string): PhotoAnalysisResult {
  // Strip markdown fences if present
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    //  extract embedded JSON object
    const jsonMatch = cleaned.match(/\{[^{}]*"status"\s*:\s*"[^"]+?"[^{}]*\}/);
    if (jsonMatch) {
      try { parsed = JSON.parse(jsonMatch[0]); } catch { /* fall through */ }
    }
    if (!parsed) {
      throw new Error(`Vision AI returned non-JSON content: "${cleaned.slice(0, 200)}"`);
    }
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.status !== "string") {
    throw new Error(`Vision response missing 'status' field`);
  }

  const validStatuses = ["detected", "not_detected", "inconclusive"];
  const status = validStatuses.includes(obj.status)
    ? (obj.status as PhotoAnalysisResult["status"])
    : "inconclusive";

  const confidence = typeof obj.confidence === "number"
    ? Math.max(0, Math.min(100, Math.round(obj.confidence)))
    : 0;

  const indicators = Array.isArray(obj.indicators)
    ? obj.indicators.filter((i): i is string => typeof i === "string")
    : [];

  const explanation = typeof obj.explanation === "string"
    ? obj.explanation.slice(0, 300)
    : "Analysis completed. This is a non-diagnostic screening aid only.";

  return { status, confidence, indicators, explanation, source: "ai", model };
}

//  Fallback 
function fallbackPhotoResult(): PhotoAnalysisResult {
  return {
    status: "inconclusive",
    confidence: 0,
    indicators: [],
    explanation:
      "Photo analysis unavailable (AI service unreachable). " +
      "Please consult a medical professional for assessment. " +
      "This is a non-diagnostic screening aid only.",
    source: "fallback",
  };
}

// YOLO result mapper

function mapYoloToResult(yolo: YoloPredictResponse): PhotoAnalysisResult {
  const validStatuses = ["detected", "not_detected", "inconclusive"];
  const status = validStatuses.includes(yolo.status)
    ? (yolo.status as PhotoAnalysisResult["status"])
    : "inconclusive";

  return {
    status,
    confidence: Math.max(0, Math.min(100, Math.round(yolo.confidence))),
    indicators: yolo.indicators ?? [],
    explanation: yolo.explanation?.slice(0, 300) ??
      "Analysis completed. This is a non-diagnostic screening aid only.",
    source: "yolo",
    model: "yolov8-ds-indicators",
  };
}

//Public API


export async function analyzePhoto(
  imageBase64: string
): Promise<PhotoAnalysisResult> {
  // 1. Try local YOLO model (primary)
  try {
    const yoloReady = await isYoloAvailable();
    if (yoloReady) {
      console.log("[visionAnalyzer] YOLO service available — using local model");
      const yoloResult = await analyzeWithYolo(imageBase64);
      const result = mapYoloToResult(yoloResult);
      console.log(
        `[visionAnalyzer] YOLO result: status=${result.status} confidence=${result.confidence}`
      );
      return result;
    }
    console.log("[visionAnalyzer] YOLO service not available — falling through to OpenRouter");
  } catch (err) {
    console.warn(
      "[visionAnalyzer] YOLO analysis failed, trying OpenRouter:",
      err instanceof Error ? err.message : err
    );
  }

  // 2. Try OpenRouter cloud vision 
  try {
    const { content, model } = await callVisionLLM(
      SYSTEM_PROMPT,
      TEXT_PROMPT,
      imageBase64
    );
    const result = parsePhotoResult(content, model);
    console.log(
      `[visionAnalyzer] OpenRouter result via ${model}: status=${result.status} confidence=${result.confidence}`
    );
    return result;
  } catch (err) {
    console.error(
      "[visionAnalyzer] OpenRouter vision call failed, using fallback:",
      err instanceof Error ? err.message : err
    );
  }

  // 3. Rule-based fallback 
  return fallbackPhotoResult();
}
