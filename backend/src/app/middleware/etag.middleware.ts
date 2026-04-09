import { Request, Response, NextFunction } from 'express';

/**
 * Express middleware that adds weak ETags to all GET responses.
 *
 * Wraps `res.json()` so the hash is computed from the final serialized body
 * (after all NestJS interceptors have run, including Decimal serialization).
 *
 * Flow:
 *  1. Request arrives → middleware wraps res.json
 *  2. NestJS processes route, interceptors transform data
 *  3. NestJS calls res.json(data) → our wrapper intercepts
 *  4a. If-None-Match matches computed ETag → 304 No Content
 *  4b. Otherwise → sets ETag + Cache-Control: no-cache, sends body normally
 *
 * No frontend changes needed — the browser handles 304 revalidation
 * transparently for XHR requests (Angular's HttpClient never sees a 304).
 */
export function etagMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== 'GET') {
    next();
    return;
  }

  const originalJson = res.json.bind(res) as (body: unknown) => Response;

  res.json = function (body: unknown): Response {
    if (res.headersSent || body === null || body === undefined) {
      return originalJson(body);
    }

    const json = JSON.stringify(body);
    const etag = djb2WeakETag(json);

    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'no-cache');

    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === etag) {
      return res.status(304).end() as unknown as Response;
    }

    return originalJson(body);
  } as typeof res.json;

  next();
}

/**
 * djb2 hash → weak ETag string.
 * Fast, good distribution, no dependencies.
 */
function djb2WeakETag(content: string): string {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash) ^ content.charCodeAt(i);
    hash = hash >>> 0; // unsigned 32-bit
  }
  return `W/"${hash.toString(16)}"`;
}
