/**
 * CareerPilot AI — OpenRouter Integration (Production)
 *
 * Single entry point for all AI features. Every API route must call
 * `generateAIResponse()` instead of talking to a provider directly.
 *
 * Features:
 * - Automatic retry with exponential backoff (429, 5xx errors)
 * - Request timeout with configurable duration
 * - Structured error handling with typed error codes
 * - OpenAI-compatible API via OpenRouter unified gateway
 *
 * Migration note: GitHub Models was retired on July 30, 2026.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default AI model for all requests.
 * 
 * Selected: openai/gpt-4o-mini
 * Reasons:
 * - Excellent JSON reliability (native structured output support)
 * - High ATS analysis accuracy (trained on diverse datasets)
 * - Fast inference (~2-3 seconds for 3K tokens)
 * - Cost-effective ($0.15/$0.60 per 1M tokens)
 * - Strong resume parsing and career guidance capabilities
 * 
 * Alternative models available:
 * - deepseek/deepseek-v3 (free but less reliable JSON)
 * - anthropic/claude-3-haiku (higher quality, 3x cost)
 */
export const DEFAULT_AI_MODEL = "openai/gpt-4o-mini";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

// Default request configuration
const DEFAULT_TIMEOUT_MS = 120_000;      // 2 minutes for long roadmap generations
const DEFAULT_MAX_TOKENS = 8192;         // Safe upper bound for all features
const DEFAULT_TEMPERATURE = 0.3;         // Low temperature for consistent structured output

// Retry configuration
const MAX_RETRIES = 3;                   // Maximum retry attempts for transient failures
const INITIAL_RETRY_DELAY_MS = 1000;     // Start with 1 second, then exponential backoff

// ─────────────────────────────────────────────────────────────────────────────
// Error Types
// ─────────────────────────────────────────────────────────────────────────────

export type AIErrorCode =
  | "MISSING_API_KEY"        // OPENROUTER_API_KEY not configured
  | "INVALID_API_KEY"        // 401/403 from OpenRouter
  | "RATE_LIMIT"             // 429 from OpenRouter (exceeded free tier or RPM)
  | "TIMEOUT"                // Request exceeded timeout duration
  | "EMPTY_RESPONSE"         // AI returned empty/null content
  | "NETWORK_ERROR"          // Fetch failed (DNS, connection, etc.)
  | "API_ERROR"              // 4xx/5xx from OpenRouter (non-retryable)
  | "PARSE_ERROR"            // JSON parsing failed
  | "MAX_RETRIES_EXCEEDED";  // Exhausted retry attempts

/** Typed error for predictable API responses — never fall back to demo data. */
export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: AIErrorCode,
    public readonly statusCode: number = 500,
    public readonly cause?: unknown,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = "AIError";
  }
}

export interface GenerateAIOptions {
  /** Override the default model for a single call. */
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Key Management
// ─────────────────────────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    throw new AIError(
      "AI service is not configured. Set OPENROUTER_API_KEY in your environment.",
      "MISSING_API_KEY",
      503,
      undefined,
      false
    );
  }
  return key;
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Mapping
// ─────────────────────────────────────────────────────────────────────────────

/** Shape of an OpenAI-compatible error body, as returned by OpenRouter. */
interface OpenAICompatibleErrorBody {
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

/**
 * Maps HTTP status codes to typed AIError instances.
 * Marks 429 and 5xx errors as retryable.
 */
function mapHttpStatusToError(status: number, body: OpenAICompatibleErrorBody | undefined): AIError {
  const providerMessage = body?.error?.message;

  if (status === 401 || status === 403) {
    return new AIError(
      "Invalid OpenRouter API key. Check OPENROUTER_API_KEY and try again.",
      "INVALID_API_KEY",
      401,
      undefined,
      false
    );
  }
  
  if (status === 429) {
    return new AIError(
      "AI rate limit reached. Please wait a moment and try again.",
      "RATE_LIMIT",
      429,
      undefined,
      true  // Rate limits are transient — retry after backoff
    );
  }

  // 5xx errors are typically transient (provider issues, capacity, etc.)
  if (status >= 500) {
    return new AIError(
      providerMessage || `OpenRouter service error (${status}). This is typically temporary.`,
      "API_ERROR",
      status,
      undefined,
      true  // Retry server errors
    );
  }

  // Other 4xx errors are client errors — don't retry
  return new AIError(
    providerMessage || `OpenRouter request failed with status ${status}.`,
    "API_ERROR",
    status >= 400 && status < 600 ? status : 502,
    undefined,
    false
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Retry Logic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sleeps for the specified duration (exponential backoff helper).
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculates exponential backoff delay with jitter.
 * @param attempt - Current retry attempt (1-indexed)
 * @returns Delay in milliseconds
 */
function getRetryDelay(attempt: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, ...
  const exponentialDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
  // Add jitter (±25%) to avoid thundering herd
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.floor(exponentialDelay + jitter);
}

// ─────────────────────────────────────────────────────────────────────────────
// Core AI Request Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends a chat-completions request to OpenRouter with automatic retry.
 * 
 * Retry behavior:
 * - Retries on 429 (rate limit) and 5xx (server errors)
 * - Uses exponential backoff with jitter
 * - Respects Retry-After header when present
 * - Maximum 3 retry attempts
 * 
 * @param systemPrompt - System message defining AI behavior
 * @param userPrompt - User message with task details
 * @param options - Request configuration (model, temperature, tokens, timeout)
 * @returns AI-generated text response
 * @throws AIError - Typed error with code, status, and retryability flag
 */
export async function generateAIResponse(
  systemPrompt: string,
  userPrompt: string,
  options: GenerateAIOptions = {}
): Promise<string> {
  const apiKey = getApiKey();
  const model = options.model ?? DEFAULT_AI_MODEL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const temperature = options.temperature ?? DEFAULT_TEMPERATURE;
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;

  // Log request initiation
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[AI:${requestId}] Starting request: model=${model}, timeout=${timeoutMs}ms, maxTokens=${maxTokens}`);

  let lastError: AIError | null = null;

  // Retry loop
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    console.log(`[AI:${requestId}] Attempt ${attempt}/${MAX_RETRIES}`);

    try {
      const requestStart = Date.now();
      const response = await fetch(OPENROUTER_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://careerpilot.ai",
          "X-Title": "CareerPilot AI",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature,
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const requestDuration = Date.now() - requestStart;
      console.log(`[AI:${requestId}] Response received in ${requestDuration}ms, status: ${response.status}`);

      if (!response.ok) {
        let body: OpenAICompatibleErrorBody | undefined;
        try {
          body = (await response.json()) as OpenAICompatibleErrorBody;
        } catch {
          // Response body wasn't valid JSON — proceed without provider detail.
        }

        const error = mapHttpStatusToError(response.status, body);

        // Check if we should retry
        if (error.retryable && attempt < MAX_RETRIES) {
          lastError = error;
          
          // Check for Retry-After header (rate limit backoff hint)
          const retryAfter = response.headers.get("Retry-After");
          const delayMs = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : getRetryDelay(attempt);

          console.warn(
            `[AI:${requestId}] ${error.code} on attempt ${attempt}/${MAX_RETRIES}. Retrying in ${delayMs}ms...`
          );
          await sleep(delayMs);
          continue;  // Retry
        }

        // Non-retryable error or exhausted retries
        throw error;
      }

      // Success — parse response
      const payload = await response.json();
      const content = payload.choices?.[0]?.message?.content?.trim();

      if (!content) {
        console.error(`[AI:${requestId}] Empty response from AI`);
        throw new AIError(
          "AI returned an empty response. Please try again.",
          "EMPTY_RESPONSE",
          502,
          undefined,
          false
        );
      }

      console.log(`[AI:${requestId}] ✓ Success - received ${content.length} chars`);
      return content;

    } catch (error) {
      clearTimeout(timeoutId);

      // Re-throw AIError instances (already typed)
      if (error instanceof AIError) {
        // If retryable and we have attempts left, continue loop
        if (error.retryable && attempt < MAX_RETRIES) {
          lastError = error;
          const delayMs = getRetryDelay(attempt);
          console.warn(
            `[AI:${requestId}] ${error.code} on attempt ${attempt}/${MAX_RETRIES}. Retrying in ${delayMs}ms...`
          );
          await sleep(delayMs);
          continue;  // Retry
        }
        console.error(`[AI:${requestId}] ✗ Failed: ${error.message}`);
        throw error;  // Non-retryable or exhausted
      }

      // Timeout error
      if (error instanceof Error && error.name === "AbortError") {
        const timeoutError = new AIError(
          `AI request timed out after ${Math.round(timeoutMs / 1000)} seconds.`,
          "TIMEOUT",
          504,
          error,
          true  // Timeouts are retryable (may be transient network issues)
        );

        if (attempt < MAX_RETRIES) {
          lastError = timeoutError;
          const delayMs = getRetryDelay(attempt);
          console.warn(
            `[AI:${requestId}] Timeout on attempt ${attempt}/${MAX_RETRIES}. Retrying in ${delayMs}ms...`
          );
          await sleep(delayMs);
          continue;  // Retry
        }

        console.error(`[AI:${requestId}] ✗ Timeout after ${MAX_RETRIES} attempts`);
        throw timeoutError;
      }

      // Network or fetch errors
      const networkError = new AIError(
        "Unable to reach the AI service. Check your network connection and try again.",
        "NETWORK_ERROR",
        503,
        error,
        true  // Network errors are retryable
      );

      if (attempt < MAX_RETRIES) {
        lastError = networkError;
        const delayMs = getRetryDelay(attempt);
        console.warn(
          `[AI:${requestId}] Network error on attempt ${attempt}/${MAX_RETRIES}. Retrying in ${delayMs}ms...`
        );
        await sleep(delayMs);
        continue;  // Retry
      }

      console.error(`[AI:${requestId}] ✗ Network error after ${MAX_RETRIES} attempts`);
      throw networkError;
    }
  }

  // If we exit the loop, we exhausted all retries
  console.error(`[AI:${requestId}] ✗ Exhausted all ${MAX_RETRIES} retry attempts`);
  throw new AIError(
    `AI request failed after ${MAX_RETRIES} attempts. Last error: ${lastError?.message || "Unknown"}`,
    "MAX_RETRIES_EXCEEDED",
    503,
    lastError,
    false
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strips optional markdown fences and parses JSON from an AI response.
 * 
 * Handles common AI output formats:
 * - Plain JSON
 * - JSON wrapped in ```json...```
 * - JSON wrapped in ```...```
 */
export function parseAIJson<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch (error) {
    throw new AIError(
      "AI returned invalid JSON. Please try again.",
      "PARSE_ERROR",
      502,
      error,
      false
    );
  }
}

/**
 * Maps AIError (or unknown errors) to a Next.js-friendly status + body.
 * 
 * Use this in API routes to convert AIError → HTTP response:
 * ```ts
 * try {
 *   const result = await generateAIResponse(...);
 * } catch (error) {
 *   const { status, body } = getAIErrorPayload(error);
 *   return NextResponse.json(body, { status });
 * }
 * ```
 */
export function getAIErrorPayload(error: unknown): { status: number; body: Record<string, string> } {
  if (error instanceof AIError) {
    return {
      status: error.statusCode,
      body: { error: error.message, code: error.code },
    };
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  return {
    status: 500,
    body: { error: "Request failed.", detail: message },
  };
}
