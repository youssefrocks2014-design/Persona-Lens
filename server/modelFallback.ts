/** Ordered Gemini model preference chain: primary model followed by fast backups. */
export const GEMINI_MODEL_CHAIN = [
  'gemini-4-hydrogen',
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
] as const;

/** Sanitized error safe to return to the client UI without raw SDK payloads. */
export class FriendlyGeminiError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'FriendlyGeminiError';
    this.statusCode = statusCode;
  }
}

/** Raised when a Gemini model returns an empty or whitespace-only response body. */
export class EmptyModelResponseError extends Error {
  readonly model: string;

  constructor(model: string) {
    super(`Model ${model} returned an empty response.`);
    this.name = 'EmptyModelResponseError';
    this.model = model;
  }
}

class AttemptTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(model: string, timeoutMs: number) {
    super(`Model ${model} timed out after ${timeoutMs}ms.`);
    this.name = 'AttemptTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

interface ErrorInspection {
  statusCode: number | null;
  rawMessage: string;
  isTimeout: boolean;
}

function inspectError(err: unknown): ErrorInspection {
  if (!err || typeof err !== 'object') {
    const raw = typeof err === 'string' ? err : String(err ?? '');
    return {
      statusCode: null,
      rawMessage: raw,
      isTimeout: /timed out|timeout|AbortError/i.test(raw),
    };
  }

  if (err instanceof AttemptTimeoutError || err instanceof EmptyModelResponseError) {
    return {
      statusCode: 503,
      rawMessage: err.message,
      isTimeout: err instanceof AttemptTimeoutError,
    };
  }

  const record = err as Record<string, unknown>;
  const nestedError =
    record.error && typeof record.error === 'object'
      ? (record.error as Record<string, unknown>)
      : null;

  let statusCode: number | null = null;
  for (const candidate of [
    record.statusCode,
    record.status,
    record.code,
    nestedError?.code,
    nestedError?.status,
  ]) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      statusCode = candidate;
      break;
    }
  }

  const rawMessage =
    typeof record.message === 'string'
      ? record.message
      : typeof nestedError?.message === 'string'
        ? nestedError.message
        : String(err);

  const isTimeout =
    record.name === 'AbortError' ||
    record.name === 'TimeoutError' ||
    /timed out|timeout|aborted/i.test(rawMessage);

  if (statusCode === null) {
    if (/\b503\b|UNAVAILABLE|Service Unavailable/i.test(rawMessage)) {
      statusCode = 503;
    } else if (/\b429\b|RESOURCE_EXHAUSTED|Too Many Requests/i.test(rawMessage)) {
      statusCode = 429;
    } else if (/\b401\b|\b403\b|API_KEY_INVALID|PERMISSION_DENIED/i.test(rawMessage)) {
      statusCode = 403;
    } else if (/\b404\b|NOT_FOUND/i.test(rawMessage)) {
      statusCode = 404;
    }
  }

  return { statusCode, rawMessage, isTimeout };
}

export function isFallbackRetryableError(err: unknown): {
  retryable: boolean;
  statusCode: 429 | 503 | null;
} {
  const { statusCode, rawMessage, isTimeout } = inspectError(err);

  if (
    isTimeout ||
    statusCode === 503 ||
    /\b503\b|UNAVAILABLE|Service Unavailable|high demand|overloaded/i.test(rawMessage)
  ) {
    return { retryable: true, statusCode: 503 };
  }

  if (
    statusCode === 429 ||
    /\b429\b|RESOURCE_EXHAUSTED|Too Many Requests|rate limit/i.test(rawMessage)
  ) {
    return { retryable: true, statusCode: 429 };
  }

  if (/ECONNRESET|ETIMEDOUT/i.test(rawMessage)) {
    return { retryable: true, statusCode: 503 };
  }

  return { retryable: false, statusCode: null };
}

export function sanitizeRawErrorText(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) {
    return 'Unable to complete the AI request right now. Please try again in a moment.';
  }

  const containsRawJsonOrSdkDump =
    trimmed.includes('{') ||
    trimmed.includes('}') ||
    /^ApiError\b/i.test(trimmed) ||
    /"error"\s*:/.test(trimmed) ||
    /"status"\s*:/.test(trimmed);

  if (containsRawJsonOrSdkDump) {
    if (/\b503\b|UNAVAILABLE|high demand|overloaded|Service Unavailable/i.test(trimmed)) {
      return 'The AI service is temporarily busy right now. Please wait a moment and try again.';
    }
    if (/\b429\b|RESOURCE_EXHAUSTED|Too Many Requests|rate limit|quota/i.test(trimmed)) {
      return 'The AI service is receiving too many requests right now. Please wait a few seconds and try again.';
    }
    return 'Unable to complete the AI request right now. Please try again in a moment.';
  }

  return trimmed;
}

export function toFriendlyGeminiError(
  err: unknown,
  options?: { triedFallbacks?: boolean }
): { message: string; statusCode: number } {
  if (err instanceof FriendlyGeminiError) {
    return { message: err.message, statusCode: err.statusCode };
  }

  const { statusCode, rawMessage, isTimeout } = inspectError(err);
  const triedFallbacks = options?.triedFallbacks ?? false;

  if (/GEMINI_API_KEY/i.test(rawMessage)) {
    return {
      statusCode: 500,
      message: 'The server AI key is missing. Add GEMINI_API_KEY in Settings > Secrets and try again.',
    };
  }

  if (
    statusCode === 401 ||
    statusCode === 403 ||
    /API_KEY_INVALID|PERMISSION_DENIED|unauthorized/i.test(rawMessage)
  ) {
    return {
      statusCode: 500,
      message: 'The server AI key could not be authorized. Please check GEMINI_API_KEY in Settings > Secrets.',
    };
  }

  if (err instanceof EmptyModelResponseError) {
    return {
      statusCode: 503,
      message: 'The AI service returned an empty response. Please try again in a moment.',
    };
  }

  if (isTimeout) {
    return {
      statusCode: 503,
      message:
        'The AI service took too long to respond under heavy demand. Please try again in a moment.',
    };
  }

  if (
    statusCode === 503 ||
    /\b503\b|UNAVAILABLE|Service Unavailable|high demand|overloaded/i.test(rawMessage)
  ) {
    return {
      statusCode: 503,
      message: triedFallbacks
        ? 'The AI service is temporarily experiencing high demand, and our backup models are also busy right now. Please wait a moment and try again.'
        : 'The AI service is temporarily experiencing high demand right now. Please wait a moment and try again.',
    };
  }

  if (
    statusCode === 429 ||
    /\b429\b|RESOURCE_EXHAUSTED|Too Many Requests|rate limit|quota/i.test(rawMessage)
  ) {
    return {
      statusCode: 429,
      message: triedFallbacks
        ? 'The AI service hit rate limits across our primary and backup models right now. Please pause briefly and try again.'
        : 'The AI service is receiving too many requests right now. Please wait a few seconds and try again.',
    };
  }

  if (statusCode === 404 || /\b404\b|NOT_FOUND/i.test(rawMessage)) {
    return {
      statusCode: 503,
      message: 'The AI model is temporarily unavailable right now. Please try again shortly.',
    };
  }

  if (/ECONNRESET|ETIMEDOUT|ENOTFOUND|fetch failed|network/i.test(rawMessage)) {
    return {
      statusCode: 503,
      message: 'Could not reach the AI service right now. Please try again in a moment.',
    };
  }

  return {
    statusCode: 500,
    message: sanitizeRawErrorText(rawMessage),
  };
}

export function supportsThinkingLevelConfig(model: string): boolean {
  return model.startsWith('gemini-4') || model.startsWith('gemini-3.8');
}

export function getThinkingLevelForModel(model: string): 'LOW' | 'MINIMAL' | null {
  if (model.startsWith('gemini-3.8')) {
    return 'MINIMAL';
  }
  if (model.startsWith('gemini-4')) {
    return 'LOW';
  }
  return null;
}

export interface ModelFallbackOptions {
  models?: readonly string[];
  retryDelayMs?: number;
  attemptTimeoutMs?: number;
  finalTimeoutMs?: number;
  operationLabel?: string;
}

async function runAttemptWithTimeout<T>(
  model: string,
  timeoutMs: number,
  invokeModel: (model: string, abortSignal: AbortSignal) => Promise<T>
): Promise<T> {
  const controller = new AbortController();
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return invokeModel(model, controller.signal);
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      invokeModel(model, controller.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new AttemptTimeoutError(model, timeoutMs));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

/**
 * Executes a Gemini request across GEMINI_MODEL_CHAIN, automatically failing over on
 * HTTP 503, HTTP 429, empty responses, or per-attempt timeouts, and converting final
 * errors into clean user-facing messages.
 */
export async function generateWithModelFallback<T>(
  invokeModel: (model: string, abortSignal?: AbortSignal) => Promise<T>,
  options?: ModelFallbackOptions
): Promise<{ result: T; modelUsed: string }> {
  const models = options?.models ?? GEMINI_MODEL_CHAIN;
  const retryDelayMs = options?.retryDelayMs ?? 0;
  const attemptTimeoutMs = options?.attemptTimeoutMs ?? 10000;
  const finalTimeoutMs = options?.finalTimeoutMs ?? 22000;

  if (models.length === 0) {
    throw new FriendlyGeminiError('No AI models are configured for this request.', 500);
  }

  let lastError: unknown;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const hasNextModel = i < models.length - 1;
    const timeoutForAttempt = hasNextModel ? attemptTimeoutMs : finalTimeoutMs;

    try {
      const result = await runAttemptWithTimeout(model, timeoutForAttempt, invokeModel);
      return { result, modelUsed: model };
    } catch (err) {
      lastError = err;
      const { retryable } = isFallbackRetryableError(err);

      if (retryable && hasNextModel) {
        if (retryDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
        continue;
      }

      const friendly = toFriendlyGeminiError(err, {
        triedFallbacks: i > 0 || !hasNextModel,
      });
      throw new FriendlyGeminiError(friendly.message, friendly.statusCode);
    }
  }

  const friendly = toFriendlyGeminiError(lastError, { triedFallbacks: models.length > 1 });
  throw new FriendlyGeminiError(friendly.message, friendly.statusCode);
}
