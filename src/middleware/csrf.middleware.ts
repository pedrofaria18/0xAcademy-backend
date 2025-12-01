import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { randomBytes, createHmac } from 'crypto';
import { env } from '../utils/validateEnv';
import { logger } from '../utils/logger';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Modern CSRF Protection using Double Submit Cookie Pattern
 *
 * This is more suitable for stateless APIs with JWT authentication.
 * The client receives a CSRF token in both:
 * 1. A cookie (httpOnly, secure, sameSite)
 * 2. Response body/header (to be included in requests)
 *
 * For state-changing requests (POST, PUT, DELETE, PATCH),
 * the client must send the token in a custom header.
 */

/**
 * Generate a cryptographically secure CSRF token
 */
function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Create HMAC signature for CSRF token
 */
function signToken(token: string): string {
  return createHmac('sha256', env.JWT_SECRET)
    .update(token)
    .digest('hex');
}

/**
 * Verify CSRF token signature
 */
function verifyToken(token: string, signature: string): boolean {
  const expectedSignature = signToken(token);
  // Use timing-safe comparison
  return timingSafeEqual(expectedSignature, signature);
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Middleware to generate and set CSRF token
 * Call this on endpoints that need CSRF protection (e.g., after login)
 *
 * @example
 * router.post('/auth/verify', setCsrfToken, verifySignature);
 */
export const setCsrfToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Generate new CSRF token
    const csrfToken = generateCsrfToken();
    const signature = signToken(csrfToken);

    // Set CSRF token in httpOnly cookie
    res.cookie(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    });

    // Also send token in response header so client can read it
    res.setHeader('X-CSRF-Token', signature);

    // Attach token to request for use in response
    req.csrfToken = signature;

    logger.debug('CSRF token generated and set');
    next();
  } catch (error) {
    logger.error('CSRF token generation error:', error);
    next();
  }
};

/**
 * Middleware to verify CSRF token on state-changing requests
 * Apply this to POST, PUT, DELETE, PATCH routes that modify data
 *
 * @example
 * router.post('/courses', authenticate, verifyCsrfToken, createCourse);
 */
export const verifyCsrfToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Skip CSRF check for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  try {
    // Get token from cookie
    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];

    // Get signature from header
    const headerSignature = req.get(CSRF_HEADER_NAME);

    // Both must be present
    if (!cookieToken || !headerSignature) {
      logger.warn('CSRF validation failed: Missing token or signature', {
        hasCookie: !!cookieToken,
        hasHeader: !!headerSignature,
        method: req.method,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        message: 'CSRF token validation failed. Please refresh and try again.',
        code: 'CSRF_TOKEN_MISSING',
      });
    }

    // Verify the signature matches the cookie token
    if (!verifyToken(cookieToken, headerSignature)) {
      logger.warn('CSRF validation failed: Invalid signature', {
        method: req.method,
        path: req.path,
        userId: req.user?.id,
      });

      return res.status(403).json({
        success: false,
        message: 'CSRF token validation failed. Please refresh and try again.',
        code: 'CSRF_TOKEN_INVALID',
      });
    }

    logger.debug('CSRF token validated successfully');
    next();
  } catch (error) {
    logger.error('CSRF validation error:', error);
    return res.status(403).json({
      success: false,
      message: 'CSRF token validation error',
      code: 'CSRF_VALIDATION_ERROR',
    });
  }
};

/**
 * Optional CSRF protection - logs but doesn't block
 * Useful during migration or for non-critical endpoints
 */
export const softCsrfCheck = (req: AuthRequest, _res: Response, next: NextFunction) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerSignature = req.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerSignature || !verifyToken(cookieToken, headerSignature)) {
    logger.warn('Soft CSRF check failed (not blocking)', {
      method: req.method,
      path: req.path,
      userId: req.user?.id,
    });
  }

  next();
};

/**
 * Clear CSRF token (e.g., on logout)
 */
export const clearCsrfToken = (_req: AuthRequest, res: Response, next: NextFunction) => {
  res.clearCookie(CSRF_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  next();
};

/**
 * Extend Express Request interface for TypeScript
 */
declare module 'express' {
  interface Request {
    csrfToken?: string;
  }
}
