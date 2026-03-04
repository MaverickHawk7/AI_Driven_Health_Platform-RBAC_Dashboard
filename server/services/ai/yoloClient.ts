

export interface YoloHealthResponse {
  status: string;
  model_loaded: boolean;
  model_path: string;
}

export interface YoloPredictResponse {
  status: "detected" | "not_detected" | "inconclusive";
  confidence: number;
  indicators: string[];
  explanation: string;
}

// ── Config ─────────────────────────────────────────────────────────────────

const YOLO_SERVICE_URL = process.env.YOLO_SERVICE_URL || "http://localhost:8001";
const HEALTH_TIMEOUT_MS = 3_000;
const PREDICT_TIMEOUT_MS = 30_000; // YOLO on CPU can be slow

// ── Health check cache (avoid hammering the service) ──────────────────────

let _cachedAvailability: { available: boolean; timestamp: number } | null = null;
const CACHE_TTL_MS = 30_000; // 30 seconds


export function isYoloEnabled(): boolean {
  const val = process.env.YOLO_ENABLED;
 
  return val !== "false";
}


export async function isYoloAvailable(): Promise<boolean> {
  if (!isYoloEnabled()) {
    return false;
  }

  // Return cached result if fresh
  if (_cachedAvailability && Date.now() - _cachedAvailability.timestamp < CACHE_TTL_MS) {
    return _cachedAvailability.available;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

    const response = await fetch(`${YOLO_SERVICE_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      _cachedAvailability = { available: false, timestamp: Date.now() };
      return false;
    }

    const health: YoloHealthResponse = await response.json();
    const available = health.status === "ok" && health.model_loaded === true;

    _cachedAvailability = { available, timestamp: Date.now() };
    console.log(
      `[yoloClient] Health check: ${available ? "available" : "not available"} ` +
      `(model_loaded: ${health.model_loaded})`
    );
    return available;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.log(`[yoloClient] Health check failed: ${errMsg.includes("abort") ? "timeout" : errMsg}`);
    _cachedAvailability = { available: false, timestamp: Date.now() };
    return false;
  }
}

/**
 * Send an image to the YOLO service for prediction.
 *
 * @param imageBase64  Base64-encoded image (with or without data URI prefix)
 * @returns            Prediction result from the YOLO model
 * @throws             If the service is unavailable or returns an error
 */
export async function analyzeWithYolo(imageBase64: string): Promise<YoloPredictResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PREDICT_TIMEOUT_MS);

  try {
    const response = await fetch(`${YOLO_SERVICE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageBase64 }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      const body = await response.text().catch(() => "(unreadable)");
      throw new Error(`YOLO service returned ${response.status}: ${body.slice(0, 200)}`);
    }

    const result: YoloPredictResponse = await response.json();
    console.log(
      `[yoloClient] Prediction: status=${result.status} confidence=${result.confidence} ` +
      `indicators=[${result.indicators.join(", ")}]`
    );
    return result;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}
