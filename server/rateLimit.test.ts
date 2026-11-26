import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyFirebaseBearerToken } from './auth.ts';
import { SlidingWindowRateLimiter } from './rateLimit.ts';

test('SlidingWindowRateLimiter enforces per-user ceiling and resets after window expires', () => {
  const limiter = new SlidingWindowRateLimiter(3, 60_000);
  const t0 = 1_000_000;

  assert.equal(limiter.check('user-a', t0).allowed, true);
  assert.equal(limiter.check('user-a', t0 + 100).allowed, true);
  assert.equal(limiter.check('user-a', t0 + 200).allowed, true);

  const blocked = limiter.check('user-a', t0 + 300);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds >= 59);

  // Separate user has independent quota
  assert.equal(limiter.check('user-b', t0 + 300).allowed, true);

  // Allowed again once window rolls forward
  assert.equal(limiter.check('user-a', t0 + 60_001).allowed, true);
});

test('verifyFirebaseBearerToken rejects missing, malformed, and oversized tokens cleanly', async () => {
  await assert.rejects(
    () => verifyFirebaseBearerToken(undefined),
    /Missing Authorization Bearer token/
  );
  await assert.rejects(
    () => verifyFirebaseBearerToken('Bearer invalid.not-base64-json.sig'),
    /Malformed Firebase ID token/
  );
  await assert.rejects(
    () => verifyFirebaseBearerToken(`Bearer ${'a'.repeat(9000)}`),
    /Malformed Firebase ID token/
  );
});
