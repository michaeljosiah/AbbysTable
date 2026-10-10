/**
 * A sliding-window limit per key — the storefront's own per-address limits on
 * its public POSTs (the sign-up lists, the Contact form).
 *
 * Best-effort and per server process (a deployment with several instances
 * multiplies it), keyed by `clientAddress`. With no address to key on (local
 * development) callers admit, rather than share one bucket that would block
 * everyone.
 *
 * SERVER-ONLY.
 */

/** Bounds the memory a flood of distinct addresses can take. */
const MAX_TRACKED = 10_000;

export class AttemptLimiter {
  private readonly attempts = new Map<string, number[]>();

  constructor(
    /** Attempts allowed per key… */
    readonly limit: number,
    /** …within this window. */
    readonly windowMs: number,
  ) {}

  /**
   * Records an attempt for `key` and answers whether it may go ahead: false
   * once `limit` attempts were made within the window.
   */
  admit(key: string, now = Date.now()): boolean {
    const recent = (this.attempts.get(key) ?? []).filter((at) => now - at < this.windowMs);
    if (recent.length >= this.limit) {
      this.attempts.set(key, recent);
      return false;
    }
    recent.push(now);
    // Oldest first: a Map iterates in insertion order, so re-insert to refresh.
    this.attempts.delete(key);
    this.attempts.set(key, recent);
    if (this.attempts.size > MAX_TRACKED) {
      const oldest = this.attempts.keys().next().value;
      if (oldest !== undefined) this.attempts.delete(oldest);
    }
    return true;
  }

  /** Forgets every attempt (tests, and nothing else). */
  clear(): void {
    this.attempts.clear();
  }
}
