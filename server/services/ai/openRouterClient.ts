/**
 * openRouterClient.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin HTTP wrapper around the OpenRouter REST API.
 * Tries a rotation of free models in order; moves to the next on 429 or error.
 *
 * ── HOW TO REPLACE THIS WITH A DIFFERENT PROVIDER ────────────────────────────
 *   • OpenAI:     change BASE_URL → "https://api.openai.com/v1/chat/completions"
 *                 swap the Authorization header key to OPENAI_API_KEY
 *   • Anthropic:  use the @anthropic-ai/sdk package instead of raw fetch
 *   • Local Ollama: change BASE_URL → "http://localhost:11434/api/chat"
 *                   adjust the request/response shape to Ollama's format
 *
 * Contract: callLLM(systemPrompt, userMessage) → { content: string }
 * Nothing outside this file depends on OpenRouter specifics.
 * ─────────────────────────────────────────────────────────────────────
 * ────────
 */

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Free models to try in order.
 * On 429 or empty response, the next model in the list is attempted.
 */
const MODEL_ROTATION = [
  "google/gemma-3-27b-it:free",
  "google/gemma-3-12b-it:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "google/gemma-3-4b-it:free",
  "nvidia/nemotron-nano-12b-v2:free",
  "deepseek/deepseek-r1-0528:free",
];

export interface LLMCallOptions {
  /** Override the model rotation with a single specific model. */
  model?: string;
  /** Sampling temperature (0 = deterministic, 1 = creative). Default: 0.1 */
  temperature?: number;
  /** Maximum tokens to generate. Default: 1024 */
  maxTokens?: number;
}

export interface LLMResponse {
  /** The raw text content returned by the model. */
  content: string;
  /** Which model actually produced the response. */
  model: string;
}

/**
 * Make a chat-completion call to OpenRouter, rotating through free models on 429.
 *
 * @param systemPrompt  Instruction context for the model (role, rules, format).
 * @param userMessage   The actual data/question to evaluate.
 * @param options       Optional overrides for model list, temperature, maxTokens.
 * @returns             Raw string content from the model's first completion.
 *
 * @throws if OPENROUTER_API_KEY is not set, or if all models fail.
 */
export async function callLLM(
  systemPrompt: string,
  userMessage: string,
  options: LLMCallOptions = {}
): Promise<LLMResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY environment variable is not set. " +
      "Add it to your .env file to enable AI risk analysis."
    );
  }

  const temperature = options.temperature ?? 0.1;
  const maxTokens   = options.maxTokens   ?? 1024;
  const modelsToTry = (options.model ? [options.model] : MODEL_ROTATION).slice(0, MAX_MODELS_TO_TRY);

  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type":  "application/json",
    "HTTP-Referer":  "https://healthtrack-dashboard.internal",
    "X-Title":       "HealthTrack Risk Analyzer",
  };

  const lastErrors: string[] = [];

  for (const model of modelsToTry) {
    const isReasoningModel = model.includes("gpt-oss") || model.includes("deepseek-r1") || model.includes("nemotron");

    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userMessage  },
      ],
      temperature,
      max_tokens: isReasoningModel ? Math.max(maxTokens, 4096) : maxTokens,
    };

    // response_format JSON mode — supported by most models
    body.response_format = { type: "json_object" };

    // Reasoning models need a budget cap so output tokens aren't consumed by CoT
    if (isReasoningModel) {
      body.reasoning = { effort: "low" };
    }

    // Try this model with wait-and-retry on 429
    for (let attempt = 0; attempt <= RATE_LIMIT_RETRIES; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(OPENROUTER_BASE_URL, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timer);
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`[openRouterClient] Fetch error on ${model}: ${errMsg}`);
        lastErrors.push(`${model}: ${errMsg.includes("abort") ? "timeout" : "network error"}`);
        break;
      } finally {
        clearTimeout(timer);
      }

      if (response.status === 429) {
        if (attempt < RATE_LIMIT_RETRIES) {
          console.warn(`[openRouterClient] 429 on ${model} — waiting ${RATE_LIMIT_WAIT_MS / 1000}s before retry ${attempt + 1}/${RATE_LIMIT_RETRIES}`);
          await delay(RATE_LIMIT_WAIT_MS);
          continue;
        }
        console.warn(`[openRouterClient] 429 on ${model} — retries exhausted, trying next model`);
        lastErrors.push(`${model}: 429 rate-limited`);
        break;
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "(unreadable body)");
        console.warn(`[openRouterClient] ${response.status} on ${model}: ${errorBody.slice(0, 200)}`);
        lastErrors.push(`${model}: HTTP ${response.status}`);
        break;
      }

      const data = (await response.json()) as {
        choices?: Array<{
          message?: { content?: string; reasoning?: string };
          finish_reason?: string;
        }>;
      };

      const msg = data?.choices?.[0]?.message;
      const rawContent   = msg?.content?.trim()   ?? "";
      const rawReasoning = msg?.reasoning?.trim()  ?? "";

      let content: string | undefined;
      if (rawContent.startsWith("{")) {
        content = rawContent;
      } else if (rawReasoning.startsWith("{")) {
        content = rawReasoning;
      } else {
        const jsonMatch = (rawContent + "\n" + rawReasoning).match(/\{[^{}]*"risk[^{}]*\}/);
        content = jsonMatch?.[0] ?? (rawContent || rawReasoning);
      }

      if (!content) {
        console.warn(`[openRouterClient] Empty response from ${model} — trying next model`);
        lastErrors.push(`${model}: empty response`);
        break;
      }

      console.log(`[openRouterClient] Success with model: ${model}`);
      return { content, model };
    }
  }

  throw new Error(
    `All models failed. Errors: ${lastErrors.join(" | ")}`
  );
}

// ── Vision (multimodal) support ─────────────────────────────────────────

/** Free vision-capable models to try in order. */
const VISION_MODEL_ROTATION = [
  "google/gemma-3-27b-it:free",
  "google/gemma-3-12b-it:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "google/gemma-3-4b-it:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "qwen/qwen2.5-vl-72b-instruct:free",
  "qwen/qwen2.5-vl-32b-instruct:free",
  "deepseek/deepseek-r1-0528:free",
];

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

/** Max retries on 429 before moving to next model */
const RATE_LIMIT_RETRIES = 2;
/** Wait time in ms before retrying after a 429 */
const RATE_LIMIT_WAIT_MS = 3_000;
/** Max models to try before giving up (try all available) */
const MAX_MODELS_TO_TRY = 6;
/** Per-request timeout in ms */
const FETCH_TIMEOUT_MS = 20_000;

export interface VisionLLMCallOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Make a vision chat-completion call to OpenRouter with a base64 image.
 * Rotates through vision-capable models on failure.
 */
export async function callVisionLLM(
  systemPrompt: string,
  textPrompt: string,
  imageBase64: string,
  options: VisionLLMCallOptions = {}
): Promise<LLMResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY environment variable is not set. " +
      "Add it to your .env file to enable vision analysis."
    );
  }

  const temperature = options.temperature ?? 0.1;
  const maxTokens   = options.maxTokens   ?? 2048;
  const modelsToTry = (options.model ? [options.model] : VISION_MODEL_ROTATION).slice(0, MAX_MODELS_TO_TRY);

  // Ensure the base64 string has the data URI prefix
  const imageUrl = imageBase64.startsWith("data:")
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type":  "application/json",
    "HTTP-Referer":  "https://healthtrack-dashboard.internal",
    "X-Title":       "HealthTrack Vision Analyzer",
  };

  const lastErrors: string[] = [];

  for (const model of modelsToTry) {
    const body = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: textPrompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      temperature,
      max_tokens: maxTokens,
    };

    // Try this model with wait-and-retry on 429
    for (let attempt = 0; attempt <= RATE_LIMIT_RETRIES; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(OPENROUTER_BASE_URL, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timer);
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`[openRouterClient] Fetch error on vision model ${model}: ${errMsg}`);
        lastErrors.push(`${model}: ${errMsg.includes("abort") ? "timeout" : "network error"}`);
        break;
      } finally {
        clearTimeout(timer);
      }

      if (response.status === 429) {
        if (attempt < RATE_LIMIT_RETRIES) {
          console.warn(`[openRouterClient] 429 on vision model ${model} — waiting ${RATE_LIMIT_WAIT_MS / 1000}s before retry ${attempt + 1}/${RATE_LIMIT_RETRIES}`);
          await delay(RATE_LIMIT_WAIT_MS);
          continue;
        }
        console.warn(`[openRouterClient] 429 on vision model ${model} — retries exhausted, trying next model`);
        lastErrors.push(`${model}: 429 rate-limited`);
        break;
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "(unreadable)");
        console.warn(`[openRouterClient] ${response.status} on vision model ${model}: ${errorBody.slice(0, 200)}`);
        lastErrors.push(`${model}: HTTP ${response.status}`);
        break;
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const content = data?.choices?.[0]?.message?.content?.trim();
      if (!content) {
        console.warn(`[openRouterClient] Empty response from vision model ${model} — trying next`);
        lastErrors.push(`${model}: empty response`);
        break;
      }

      console.log(`[openRouterClient] Vision success with model: ${model}`);
      return { content, model };
    }
  }

  throw new Error(
    `All vision models failed. Errors: ${lastErrors.join(" | ")}`
  );
}
