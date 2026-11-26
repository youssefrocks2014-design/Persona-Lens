export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export class SlidingWindowRateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly buckets = new Map<string, number[]>();

  constructor(maxRequests = 24, windowMs = 60_000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  check(key: string, nowMs = Date.now()): RateLimitDecision {
    const cutoff = nowMs - this.windowMs;
    const existing = this.buckets.get(key) ?? [];
    const active = existing.filter((ts) => ts > cutoff);

    if (active.length >= this.maxRequests) {
      const oldestActive = active[0] ?? nowMs;
      const retryAfterMs = Math.max(1000, oldestActive + this.windowMs - nowMs);
      this.buckets.set(key, active);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
      };
    }

    active.push(nowMs);
    this.buckets.set(key, active);

    if (this.buckets.size > 500) {
      this.prune(cutoff);
    }

    return {
      allowed: true,
      remaining: Math.max(0, this.maxRequests - active.length),
      retryAfterSeconds: 0,
    };
  }

  private prune(cutoff: number): void {
    for (const [k, timestamps] of this.buckets.entries()) {
      const active = timestamps.filter((ts) => ts > cutoff);
      if (active.length === 0) {
        this.buckets.delete(k);
      } else {
        this.buckets.set(k, active);
      }
    }
  }
}

export const aiEndpointRateLimiter = new SlidingWindowRateLimiter(24, 60_000);
