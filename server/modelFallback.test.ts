import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EmptyModelResponseError,
  FriendlyGeminiError,
  GEMINI_MODEL_CHAIN,
  generateWithModelFallback,
  isFallbackRetryableError,
  supportsThinkingLevelConfig,
  toFriendlyGeminiError,
} from './modelFallback.ts';

test('GEMINI_MODEL_CHAIN uses the exact requested fallback order', () => {
  assert.deepEqual(GEMINI_MODEL_CHAIN, [
    'gemini-4-hydrogen',
    'gemini-3.8-flash',
    'gemini-3.5-flash-lite',
  ]);
});

test('supportsThinkingLevelConfig enables thinkingLevel on gemini-4-hydrogen and gemini-3.8-flash only', () => {
  assert.equal(supportsThinkingLevelConfig('gemini-4-hydrogen'), true);
  assert.equal(supportsThinkingLevelConfig('gemini-3.8-flash'), true);
  assert.equal(supportsThinkingLevelConfig('gemini-3.5-flash-lite'), false);
});

test('generateWithModelFallback succeeds on primary model without invoking fallbacks', async () => {
  const called: string[] = [];
  const { result, modelUsed } = await generateWithModelFallback(
    async (model) => {
      called.push(model);
      return `ok-${model}`;
    },
    { retryDelayMs: 0 }
  );

  assert.equal(result, 'ok-gemini-4-hydrogen');
  assert.equal(modelUsed, 'gemini-4-hydrogen');
  assert.deepEqual(called, ['gemini-4-hydrogen']);
});

test('generateWithModelFallback retries on gemini-3.8-flash when gemini-4-hydrogen returns 503', async () => {
  const called: string[] = [];
  const { result, modelUsed } = await generateWithModelFallback(
    async (model) => {
      called.push(model);
      if (model === 'gemini-4-hydrogen') {
        const err = new Error(
          'ApiError: {"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}'
        ) as Error & { status?: number };
        err.status = 503;
        throw err;
      }
      return `ok-${model}`;
    },
    { retryDelayMs: 0 }
  );

  assert.equal(result, 'ok-gemini-3.8-flash');
  assert.equal(modelUsed, 'gemini-3.8-flash');
  assert.deepEqual(called, ['gemini-4-hydrogen', 'gemini-3.8-flash']);
});

test('generateWithModelFallback retries through 3.8-flash then 3.5-flash-lite across 429 and 503', async () => {
  const called: string[] = [];
  const { result, modelUsed } = await generateWithModelFallback(
    async (model) => {
      called.push(model);
      if (model === 'gemini-4-hydrogen') {
        throw new Error(
          '{"error":{"code":429,"message":"Resource has been exhausted.","status":"RESOURCE_EXHAUSTED"}}'
        );
      }
      if (model === 'gemini-3.8-flash') {
        throw { status: 503, message: 'Service Unavailable' };
      }
      return `ok-${model}`;
    },
    { retryDelayMs: 0 }
  );

  assert.equal(result, 'ok-gemini-3.5-flash-lite');
  assert.equal(modelUsed, 'gemini-3.5-flash-lite');
  assert.deepEqual(called, [
    'gemini-4-hydrogen',
    'gemini-3.8-flash',
    'gemini-3.5-flash-lite',
  ]);
});

test('generateWithModelFallback throws friendly error with no raw JSON when all models fail with 503 or 429', async () => {
  const called: string[] = [];
  await assert.rejects(
    async () => {
      await generateWithModelFallback(
        async (model) => {
          called.push(model);
          throw new Error(
            'ApiError: {"error":{"code":503,"message":"High demand.","status":"UNAVAILABLE"}}'
          );
        },
        { retryDelayMs: 0, operationLabel: '/api/analyze' }
      );
    },
    (err: unknown) => {
      assert.ok(err instanceof FriendlyGeminiError);
      assert.equal(err.statusCode, 503);
      assert.ok(!err.message.includes('{'));
      assert.ok(!err.message.includes('}'));
      assert.ok(!err.message.includes('ApiError'));
      assert.match(err.message, /high demand|backup models/i);
      return true;
    }
  );

  assert.deepEqual(called, [
    'gemini-4-hydrogen',
    'gemini-3.8-flash',
    'gemini-3.5-flash-lite',
  ]);
});

test('generateWithModelFallback does not cycle fallbacks on non-503/429 errors and still sanitizes raw JSON', async () => {
  const called: string[] = [];
  await assert.rejects(
    async () => {
      await generateWithModelFallback(
        async (model) => {
          called.push(model);
          throw new Error(
            'ApiError: {"error":{"code":403,"message":"API_KEY_INVALID","status":"PERMISSION_DENIED"}}'
          );
        },
        { retryDelayMs: 0 }
      );
    },
    (err: unknown) => {
      assert.ok(err instanceof FriendlyGeminiError);
      assert.equal(err.statusCode, 500);
      assert.ok(!err.message.includes('{'));
      assert.match(err.message, /Settings > Secrets/i);
      return true;
    }
  );

  assert.deepEqual(called, ['gemini-4-hydrogen']);
});

test('isFallbackRetryableError and toFriendlyGeminiError handle 429 and 503 variants cleanly', () => {
  assert.deepEqual(
    isFallbackRetryableError({ error: { code: 429, status: 'RESOURCE_EXHAUSTED' } }),
    { retryable: true, statusCode: 429 }
  );

  const friendly429 = toFriendlyGeminiError(
    new Error('{"error":{"code":429,"message":"Quota exceeded","status":"RESOURCE_EXHAUSTED"}}'),
    { triedFallbacks: true }
  );
  assert.equal(friendly429.statusCode, 429);
  assert.ok(!friendly429.message.includes('{'));
  assert.match(friendly429.message, /rate limits/i);
});

test('generateWithModelFallback fails over to gemini-3.8-flash when primary model stalls past attemptTimeoutMs', async () => {
  const called: string[] = [];
  const { result, modelUsed } = await generateWithModelFallback(
    async (model, abortSignal) => {
      called.push(model);
      if (model === 'gemini-4-hydrogen') {
        return await new Promise<string>((_resolve, reject) => {
          abortSignal?.addEventListener('abort', () => {
            const abortErr = new Error('Aborted');
            abortErr.name = 'AbortError';
            reject(abortErr);
          });
        });
      }
      return `fast-${model}`;
    },
    { attemptTimeoutMs: 25, finalTimeoutMs: 200, retryDelayMs: 0 }
  );

  assert.equal(result, 'fast-gemini-3.8-flash');
  assert.equal(modelUsed, 'gemini-3.8-flash');
  assert.deepEqual(called, ['gemini-4-hydrogen', 'gemini-3.8-flash']);
});

test('generateWithModelFallback fails over when primary model returns empty output', async () => {
  const called: string[] = [];
  const { result, modelUsed } = await generateWithModelFallback(
    async (model) => {
      called.push(model);
      if (model === 'gemini-4-hydrogen') {
        throw new EmptyModelResponseError(model);
      }
      return `recovered-${model}`;
    },
    { retryDelayMs: 0 }
  );

  assert.equal(result, 'recovered-gemini-3.8-flash');
  assert.equal(modelUsed, 'gemini-3.8-flash');
  assert.deepEqual(called, ['gemini-4-hydrogen', 'gemini-3.8-flash']);
});

test('generateWithModelFallback returns friendly 503 error if all models return empty output', async () => {
  await assert.rejects(
    async () => {
      await generateWithModelFallback(
        async (model) => {
          throw new EmptyModelResponseError(model);
        },
        { retryDelayMs: 0 }
      );
    },
    (err: unknown) => {
      assert.ok(err instanceof FriendlyGeminiError);
      assert.equal(err.statusCode, 503);
      assert.match(err.message, /empty response/i);
      return true;
    }
  );
});
