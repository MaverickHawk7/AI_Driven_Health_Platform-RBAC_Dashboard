/**
 * ollamaClient.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * HTTP client for local Ollama LLM service.
 *
 * Ollama runs locally on port 11434 by default. This client sends
 * chat-completion requests to the Ollama API for questionnaire analysis.
 *
 * Env vars:
 *   OLLAMA_BASE_URL — base URL (default: http://localhost:11434)
 *   OLLAMA_MODEL    — model to use (default: llama3.2:3b)
 *   OLLAMA_ENABLED  — set to "false" to bypass (default: true)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface OllamaResponse {
  content: string;
  model: string;
}

// ── Config ─────────────────────────────────────────────────────────────────

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:3b";
const HEALTH_TIMEOUT_MS = 3_000;
const CHAT_TIMEOUT_MS = 30_000; // local models on CPU can be slow

// ── Health check cache ────────────────────────────────────────────────────

let _cachedAvailability: { available: boolean; timestamp: number } | null = null;
const CACHE_TTL_MS = 30_000; // 30 seconds

/**
 * Check if Ollama is enabled via environment variable.
 */
export function isOllamaEnabled(): boolean {
  const val = process.env.OLLAMA_ENABLED;
  return val !== "false";
}

/**
 * Check if Ollama is available and has the configured model loaded.
 * Result is cached for 30 seconds.
 */
export async function isOllamaAvailable(): Promise<boolean> {
  if (!isOllamaEnabled()) {
    return false;
  }

  if (_cachedAvailability && Date.now() - _cachedAvailability.timestamp < CACHE_TTL_MS) {
    return _cachedAvailability.available;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      _cachedAvailability = { available: false, timestamp: Date.now() };
      return false;
    }

    const data = await response.json() as { models?: Array<{ name: string }> };
    const models = data.models ?? [];
    const hasModel = models.some(
      (m) => m.name === OLLAMA_MODEL || m.name.startsWith(OLLAMA_MODEL.split(":")[0])
    );

    _cachedAvailability = { available: hasModel, timestamp: Date.now() };
    console.log(
      `[ollamaClient] Health check: ${hasModel ? "available" : "model not found"} ` +
      `(looking for: ${OLLAMA_MODEL}, found: ${models.map(m => m.name).join(", ") || "none"})`
    );
    return hasModel;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.log(`[ollamaClient] Health check failed: ${errMsg.includes("abort") ? "timeout" : errMsg}`);
    _cachedAvailability = { available: false, timestamp: Date.now() };
    return false;
  }
}

/**
 * Send a chat-completion request to Ollama.
 *
 * @param systemPrompt  System instruction for the model
 * @param userMessage   The user's message/question
 * @returns             Model response with content and model name
 * @throws              If Ollama is unavailable or returns an error
 */
export async function callOllamaLLM(
  systemPrompt: string,
  userMessage: string
): Promise<OllamaResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 512,
        },
        format: "json",
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      const body = await response.text().catch(() => "(unreadable)");
      throw new Error(`Ollama returned ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = await response.json() as {
      message?: { content?: string };
      model?: string;
    };

    const content = data?.message?.content?.trim();
    if (!content) {
      throw new Error("Ollama returned empty response");
    }

    const model = data.model || OLLAMA_MODEL;
    console.log(`[ollamaClient] Success with model: ${model}`);
    return { content, model: `ollama/${model}` };
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}
