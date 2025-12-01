import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { AuditService, AuditAction, ResourceType } from '../services/audit.service';

export interface AuditOptions {
  action: AuditAction;
  resourceType: ResourceType;
  getResourceId?: (req: AuthRequest) => string | undefined;
  includeBody?: boolean;
  riskScore?: number;
}

/**
 * Middleware to automatically log auditable actions
 *
 * @example
 * router.post('/courses', authenticate, audit({
 *   action: 'CREATE',
 *   resourceType: 'course',
 *   getResourceId: (req) => req.body.id
 * }), createCourse);
 */
export const audit = (options: AuditOptions) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to log after response
    res.json = function (body: any): Response {
      // Log the audit event asynchronously (don't block response)
      setImmediate(async () => {
        try {
          const resourceId = options.getResourceId
            ? options.getResourceId(req)
            : req.params.id || req.params.courseId || req.params.lessonId;

          const metadata: Record<string, any> = {
            method: req.method,
            path: req.path,
            query: req.query,
          };

          if (options.includeBody && req.body) {
            metadata.body = req.body;
          }

          if (body?.success === false || res.statusCode >= 400) {
            metadata.responseStatus = res.statusCode;
            metadata.errorDetails = body;
          }

          await AuditService.log({
            userId: req.user?.id,
            walletAddress: req.user?.address,
            action: options.action,
            resourceType: options.resourceType,
            resourceId,
            ipAddress: getClientIp(req),
            userAgent: req.get('user-agent'),
            metadata,
            status: res.statusCode >= 400 ? 'failed' : 'success',
            errorMessage: body?.message,
            riskScore: options.riskScore,
          });
        } catch (error) {
          // Audit logging should never break the application
          console.error('Audit middleware error:', error);
        }
      });

      // Call original json method
      return originalJson(body);
    };

    next();
  };
};

/**
 * Middleware to log authentication attempts
 */
export const auditAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method to log after response
  res.json = function (body: any): Response {
    setImmediate(async () => {
      try {
        const ipAddress = getClientIp(req);
        const userAgent = req.get('user-agent');

        if (res.statusCode === 200 && body.user) {
          // Successful authentication
          await AuditService.logAuth({
            userId: body.user.id,
            walletAddress: body.user.address || body.user.wallet_address,
            ipAddress,
            userAgent,
            sessionId: body.token?.substring(0, 20), // First 20 chars as session identifier
          });
        } else if (res.statusCode >= 400) {
          // Failed authentication
          await AuditService.logFailedAuth({
            walletAddress: req.body?.message || 'unknown',
            ipAddress,
            userAgent,
            errorMessage: body.message || 'Authentication failed',
            riskScore: 50,
          });
        }
      } catch (error) {
        console.error('Auth audit middleware error:', error);
      }
    });

    return originalJson(body);
  };

  next();
};

/**
 * Middleware to detect and log suspicious activity
 */
export const detectSuspiciousActivity = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  let suspiciousScore = 0;
  const suspiciousReasons: string[] = [];

  // Check for suspicious patterns

  // 1. Rapid requests from same IP
  const ipAddress = getClientIp(req);
  if (ipAddress) {
    const recentFailures = await AuditService.getFailedAuthAttempts(ipAddress, 1);
    if (recentFailures > 10) {
      suspiciousScore += 30;
      suspiciousReasons.push(`${recentFailures} failed auth attempts in last hour`);
    }
  }

  // 2. Missing or suspicious user agent
  const userAgent = req.get('user-agent');
  if (!userAgent || userAgent.length < 10) {
    suspiciousScore += 20;
    suspiciousReasons.push('Missing or invalid user agent');
  }

  // 3. Suspicious request patterns (SQL injection, XSS attempts)
  const suspiciousPatterns = [
    /(\bor\b|\band\b).*(=|<|>)/i, // SQL injection patterns
    /<script|javascript:|onerror=/i, // XSS patterns
    /\.\.\/|\.\.\\/, // Path traversal
    /(union|select|insert|update|delete|drop|create)\s+(all|distinct|from|table)/i, // SQL keywords
  ];

  const allParams = JSON.stringify({ ...req.query, ...req.body, ...req.params });
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(allParams)) {
      suspiciousScore += 40;
      suspiciousReasons.push(`Suspicious pattern detected: ${pattern.source}`);
      break;
    }
  }

  // 4. Unusual request frequency
  // (This would require rate tracking, simplified for now)

  // Log if suspicious
  if (suspiciousScore >= 50) {
    await AuditService.logSuspiciousActivity({
      userId: req.user?.id,
      walletAddress: req.user?.address,
      ipAddress,
      userAgent,
      action: `${req.method} ${req.path}`,
      details: {
        reasons: suspiciousReasons,
        params: allParams.substring(0, 500), // Limit to 500 chars
      },
      riskScore: suspiciousScore,
    });

    // Block if very suspicious
    if (suspiciousScore >= 80) {
      res.status(403).json({
        success: false,
        message: 'Request blocked due to suspicious activity',
      });
      return;
    }
  }

  next();
};

/**
 * Helper to get client IP address from request
 */
function getClientIp(req: AuthRequest): string | undefined {
  // Check for common proxy headers
  const forwarded = req.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return req.ip || req.socket.remoteAddress;
}
