import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'ENROLL'
  | 'UNENROLL'
  | 'PUBLISH'
  | 'UNPUBLISH'
  | 'UPLOAD_VIDEO'
  | 'DELETE_VIDEO'
  | 'COMPLETE_LESSON'
  | 'CERTIFICATE_ISSUED'
  | 'FAILED_AUTH'
  | 'SUSPICIOUS_ACTIVITY';

export type ResourceType =
  | 'user'
  | 'course'
  | 'lesson'
  | 'enrollment'
  | 'progress'
  | 'certificate'
  | 'video'
  | 'auth'
  | 'system';

export type AuditStatus = 'success' | 'failed' | 'blocked';

export interface AuditLogEntry {
  userId?: string;
  walletAddress?: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  status?: AuditStatus;
  errorMessage?: string;
  sessionId?: string;
  riskScore?: number;
}

export class AuditService {
  /**
   * Log an audit event
   * @param entry Audit log entry details
   */
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('audit_logs' as any)
        .insert({
          user_id: entry.userId,
          wallet_address: entry.walletAddress,
          action: entry.action,
          resource_type: entry.resourceType,
          resource_id: entry.resourceId,
          ip_address: entry.ipAddress,
          user_agent: entry.userAgent,
          changes: entry.changes,
          metadata: entry.metadata,
          status: entry.status || 'success',
          error_message: entry.errorMessage,
          session_id: entry.sessionId,
          risk_score: entry.riskScore || 0,
        });

      if (error) {
        logger.error('Failed to create audit log:', error);
      }

      // Log high-risk events to console immediately
      if ((entry.riskScore || 0) > 70) {
        logger.warn(`HIGH RISK AUDIT EVENT: ${entry.action} on ${entry.resourceType}`, {
          userId: entry.userId,
          riskScore: entry.riskScore,
          metadata: entry.metadata,
        });
      }
    } catch (error) {
      logger.error('Audit logging error:', error);
      // Don't throw - audit logging failures shouldn't break the application
    }
  }

  /**
   * Log successful authentication
   */
  static async logAuth(params: {
    userId: string;
    walletAddress: string;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  }): Promise<void> {
    await this.log({
      userId: params.userId,
      walletAddress: params.walletAddress,
      action: 'LOGIN',
      resourceType: 'auth',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      sessionId: params.sessionId,
      status: 'success',
    });
  }

  /**
   * Log failed authentication attempt
   */
  static async logFailedAuth(params: {
    walletAddress?: string;
    ipAddress?: string;
    userAgent?: string;
    errorMessage: string;
    riskScore?: number;
  }): Promise<void> {
    await this.log({
      walletAddress: params.walletAddress,
      action: 'FAILED_AUTH',
      resourceType: 'auth',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      status: 'failed',
      errorMessage: params.errorMessage,
      riskScore: params.riskScore || 50,
    });
  }

  /**
   * Log suspicious activity
   */
  static async logSuspiciousActivity(params: {
    userId?: string;
    walletAddress?: string;
    ipAddress?: string;
    userAgent?: string;
    action: string;
    details: Record<string, any>;
    riskScore: number;
  }): Promise<void> {
    await this.log({
      userId: params.userId,
      walletAddress: params.walletAddress,
      action: 'SUSPICIOUS_ACTIVITY',
      resourceType: 'system',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: {
        suspiciousAction: params.action,
        ...params.details,
      },
      status: 'blocked',
      riskScore: params.riskScore,
    });
  }

  /**
   * Log course publication/unpublication
   */
  static async logCoursePublication(params: {
    userId: string;
    courseId: string;
    published: boolean;
    ipAddress?: string;
  }): Promise<void> {
    await this.log({
      userId: params.userId,
      action: params.published ? 'PUBLISH' : 'UNPUBLISH',
      resourceType: 'course',
      resourceId: params.courseId,
      ipAddress: params.ipAddress,
      metadata: {
        published: params.published,
      },
    });
  }

  /**
   * Log video operations (upload/delete)
   */
  static async logVideoOperation(params: {
    userId: string;
    action: 'UPLOAD_VIDEO' | 'DELETE_VIDEO';
    videoId: string;
    lessonId?: string;
    courseId?: string;
    ipAddress?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.log({
      userId: params.userId,
      action: params.action,
      resourceType: 'video',
      resourceId: params.videoId,
      ipAddress: params.ipAddress,
      metadata: {
        lessonId: params.lessonId,
        courseId: params.courseId,
        ...params.metadata,
      },
    });
  }

  /**
   * Log lesson completion
   */
  static async logLessonCompletion(params: {
    userId: string;
    lessonId: string;
    courseId: string;
    progress: number;
  }): Promise<void> {
    await this.log({
      userId: params.userId,
      action: 'COMPLETE_LESSON',
      resourceType: 'progress',
      resourceId: params.lessonId,
      metadata: {
        courseId: params.courseId,
        progress: params.progress,
      },
    });
  }

  /**
   * Log certificate issuance
   */
  static async logCertificateIssued(params: {
    userId: string;
    certificateId: string;
    courseId: string;
    nftTokenId?: string;
  }): Promise<void> {
    await this.log({
      userId: params.userId,
      action: 'CERTIFICATE_ISSUED',
      resourceType: 'certificate',
      resourceId: params.certificateId,
      metadata: {
        courseId: params.courseId,
        nftTokenId: params.nftTokenId,
      },
    });
  }

  /**
   * Get audit logs for a user
   */
  static async getUserAuditLogs(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      action?: AuditAction;
      resourceType?: ResourceType;
    } = {}
  ): Promise<any[]> {
    try {
      let query = supabaseAdmin
        .from('audit_logs' as any)
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (options.action) {
        query = query.eq('action', options.action);
      }

      if (options.resourceType) {
        query = query.eq('resource_type', options.resourceType);
      }

      const { data, error } = await query
        .range(options.offset || 0, (options.offset || 0) + (options.limit || 50) - 1);

      if (error) {
        logger.error('Failed to fetch audit logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Error fetching audit logs:', error);
      return [];
    }
  }

  /**
   * Get high-risk audit events
   */
  static async getHighRiskEvents(
    minRiskScore: number = 70,
    limit: number = 100
  ): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('audit_logs' as any)
        .select('*')
        .gte('risk_score', minRiskScore)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Failed to fetch high-risk events:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Error fetching high-risk events:', error);
      return [];
    }
  }

  /**
   * Get failed authentication attempts
   */
  static async getFailedAuthAttempts(
    ipAddress?: string,
    hoursBack: number = 24
  ): Promise<number> {
    try {
      const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

      let query = supabaseAdmin
        .from('audit_logs' as any)
        .select('id', { count: 'exact', head: true })
        .eq('action', 'FAILED_AUTH')
        .gte('timestamp', since);

      if (ipAddress) {
        query = query.eq('ip_address', ipAddress);
      }

      const { count, error } = await query;

      if (error) {
        logger.error('Failed to count failed auth attempts:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      logger.error('Error counting failed auth attempts:', error);
      return 0;
    }
  }
}
