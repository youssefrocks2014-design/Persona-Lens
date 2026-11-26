import crypto from 'node:crypto';
import type {
  AnalysisGenerationResult,
  Persona,
  SituationInput,
} from '../src/types/personaLens.ts';

interface CacheEntry {
  value: AnalysisGenerationResult;
  expiresAt: number;
}

/**
 * Bounded per-user LRU + TTL cache and in-flight request deduplicator for
 * Living Your Day analyses. Keys are SHA-256 hashed with the verified Firebase UID
 * so cached responses are never shared across users.
 */
export class UserScopedAnalysisCache {
  private readonly maxEntries: number;
  private readonly ttlMs: number;
  private readonly entries = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Promise<AnalysisGenerationResult>>();

  constructor(maxEntries = 120, ttlMs = 5 * 60_000) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
  }

  /** Builds a deterministic user-scoped cache key for a situation and persona card. */

  buildKey(
    userId: string,
    persona: Persona,
    situation: SituationInput
  ): string {
    return crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          userId,
          personaId: persona.id,
          personaLens: persona.lensSummary,
          title: situation.title.trim(),
          otherPersonRole: situation.otherPersonRole.trim(),
          desiredOutcome: situation.desiredOutcome.trim(),
          description: situation.description.trim(),
        })
      )
      .digest('hex');
  }

  async getOrCompute(
    key: string,
    compute: () => Promise<AnalysisGenerationResult>,
    nowMs = Date.now()
  ): Promise<{ result: AnalysisGenerationResult; cached: boolean }> {
    const existing = this.entries.get(key);
    if (existing && existing.expiresAt > nowMs) {
      // Refresh LRU insertion order
      this.entries.delete(key);
      this.entries.set(key, existing);
      return { result: existing.value, cached: true };
    }
    if (existing) {
      this.entries.delete(key);
    }

    const active = this.inFlight.get(key);
    if (active) {
      const result = await active;
      return { result, cached: true };
    }

    const promise = (async () => {
      const result = await compute();
      this.set(key, result, Date.now());
      return result;
    })();

    this.inFlight.set(key, promise);
    try {
      const result = await promise;
      return { result, cached: false };
    } finally {
      this.inFlight.delete(key);
    }
  }

  private set(key: string, value: AnalysisGenerationResult, nowMs: number): void {
    if (this.entries.size >= this.maxEntries) {
      // Evict expired first, otherwise oldest LRU entry
      for (const [k, entry] of this.entries.entries()) {
        if (entry.expiresAt <= nowMs) {
          this.entries.delete(k);
        }
      }
      if (this.entries.size >= this.maxEntries) {
        const oldestKey = this.entries.keys().next().value;
        if (oldestKey !== undefined) {
          this.entries.delete(oldestKey);
        }
      }
    }
    this.entries.set(key, {
      value,
      expiresAt: nowMs + this.ttlMs,
    });
  }

  get size(): number {
    return this.entries.size;
  }
}

export const userScopedAnalysisCache = new UserScopedAnalysisCache();
