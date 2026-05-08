import type { Request } from 'express';

/**
 * Returns the trusted client IP for use as an anonymous-user identity key.
 *
 * Uses Express's `req.ip`, which honors `app.set('trust proxy', 1)` configured
 * in `server.ts` and is therefore NOT spoofable from a raw `X-Forwarded-For`
 * header sent by an arbitrary client. Reading the header directly (e.g.
 * `req.headers['x-forwarded-for'].split(',')[0]`) bypasses that protection
 * and lets any client impersonate another anonymous viewer's identity for
 * watch-history lookups, recommendations, etc.
 *
 * This helper is safe for both authorization-keying (anonymous identity) and
 * rate-limit `keyGenerator` use.
 */
export const getClientIp = (req: Request): string => req.ip || 'unknown';
