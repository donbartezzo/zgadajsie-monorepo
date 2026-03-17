import { randomBytes } from 'crypto';
import { Request } from 'express';

type StoreCallback = (err: Error | null, state: string) => void;
type VerifyCallback = (err: Error | null, ok: boolean, state?: string) => void;

/**
 * In-memory OAuth state store - replaces the default SessionStore
 * so that express-session is not required.
 * Automatically captures `returnUrl` from the initial request query
 * and makes it available via `getReturnUrl()` after OAuth callback.
 * Each state entry auto-expires after 5 minutes.
 */
export class MemoryStateStore {
  private static instance: MemoryStateStore;

  private readonly states = new Map<string, { returnUrl: string | null; expires: number }>();
  private readonly ttlMs = 5 * 60 * 1000;

  static getInstance(): MemoryStateStore {
    if (!MemoryStateStore.instance) {
      MemoryStateStore.instance = new MemoryStateStore();
    }
    return MemoryStateStore.instance;
  }

  store(_req: Request, callback: StoreCallback): void;
  store(_req: Request, meta: unknown, callback: StoreCallback): void;
  store(req: Request, metaOrCb: unknown, callback?: StoreCallback): void {
    const cb = typeof metaOrCb === 'function' ? (metaOrCb as StoreCallback) : callback!;
    const key = randomBytes(24).toString('hex');
    const returnUrl = (req.query['returnUrl'] as string) || null;
    this.states.set(key, { returnUrl, expires: Date.now() + this.ttlMs });
    this.cleanup();
    cb(null, key);
  }

  verify(_req: Request, state: string, callback: VerifyCallback): void;
  verify(_req: Request, state: string, _meta: unknown, callback: VerifyCallback): void;
  verify(_req: Request, state: string, metaOrCb: unknown, callback?: VerifyCallback): void {
    const cb = typeof metaOrCb === 'function' ? (metaOrCb as VerifyCallback) : callback!;
    const entry = this.states.get(state);
    if (!entry || entry.expires < Date.now()) {
      this.states.delete(state);
      cb(null, false);
      return;
    }
    cb(null, true);
  }

  getReturnUrl(state: string): string | null {
    const entry = this.states.get(state);
    this.states.delete(state);
    if (!entry || entry.expires < Date.now()) {
      return null;
    }
    return entry.returnUrl;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.states) {
      if (entry.expires < now) {
        this.states.delete(key);
      }
    }
  }
}
