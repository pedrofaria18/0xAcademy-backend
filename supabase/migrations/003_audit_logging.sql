-- =====================================================
-- Migration: Audit Logging System
-- Description: Create audit log table and triggers for security monitoring
-- Created: 2025-01-23
-- =====================================================

-- ============================================================================
-- AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Who performed the action
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  wallet_address TEXT,

  -- What action was performed
  action TEXT NOT NULL,                    -- e.g., 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'
  resource_type TEXT NOT NULL,            -- e.g., 'course', 'lesson', 'user', 'enrollment'
  resource_id TEXT,                       -- ID of the affected resource

  -- When and where
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  ip_address TEXT,
  user_agent TEXT,

  -- Additional context
  changes JSONB,                          -- Before/after values for updates
  metadata JSONB,                         -- Additional context (e.g., request params)
  status TEXT DEFAULT 'success',          -- 'success', 'failed', 'blocked'
  error_message TEXT,                     -- If status is 'failed'

  -- Security fields
  session_id TEXT,
  risk_score INTEGER DEFAULT 0,           -- 0-100, higher = more suspicious

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_audit_user ON audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_action ON audit_logs(action, timestamp DESC);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_ip ON audit_logs(ip_address, timestamp DESC);
CREATE INDEX idx_audit_status ON audit_logs(status) WHERE status != 'success';
CREATE INDEX idx_audit_risk ON audit_logs(risk_score DESC) WHERE risk_score > 50;

-- GIN index for searching changes and metadata
CREATE INDEX idx_audit_changes ON audit_logs USING gin(changes);
CREATE INDEX idx_audit_metadata ON audit_logs USING gin(metadata);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can insert audit logs
CREATE POLICY audit_insert_policy ON audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Users can only view their own audit logs
CREATE POLICY audit_select_policy ON audit_logs
  FOR SELECT
  USING (auth.uid() = user_id OR auth.jwt()->>'role' = 'admin');

-- No updates or deletes allowed (immutable log)
CREATE POLICY audit_no_update_policy ON audit_logs
  FOR UPDATE
  USING (false);

CREATE POLICY audit_no_delete_policy ON audit_logs
  FOR DELETE
  USING (false);

-- ============================================================================
-- AUTOMATIC AUDIT TRIGGERS FOR CRITICAL TABLES
-- ============================================================================

-- Function to log course changes
CREATE OR REPLACE FUNCTION audit_course_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      resource_type,
      resource_id,
      changes,
      metadata
    ) VALUES (
      OLD.instructor_id,
      'DELETE',
      'course',
      OLD.id::TEXT,
      jsonb_build_object('deleted_course', row_to_json(OLD)),
      jsonb_build_object('table', TG_TABLE_NAME, 'operation', TG_OP)
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      resource_type,
      resource_id,
      changes,
      metadata
    ) VALUES (
      NEW.instructor_id,
      'UPDATE',
      'course',
      NEW.id::TEXT,
      jsonb_build_object(
        'before', row_to_json(OLD),
        'after', row_to_json(NEW)
      ),
      jsonb_build_object('table', TG_TABLE_NAME, 'operation', TG_OP)
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      resource_type,
      resource_id,
      changes,
      metadata
    ) VALUES (
      NEW.instructor_id,
      'CREATE',
      'course',
      NEW.id::TEXT,
      jsonb_build_object('new_course', row_to_json(NEW)),
      jsonb_build_object('table', TG_TABLE_NAME, 'operation', TG_OP)
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to courses table
CREATE TRIGGER audit_courses_trigger
  AFTER INSERT OR UPDATE OR DELETE ON courses
  FOR EACH ROW EXECUTE FUNCTION audit_course_changes();

-- Function to log enrollment changes (critical for access control)
CREATE OR REPLACE FUNCTION audit_enrollment_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      resource_type,
      resource_id,
      changes,
      metadata
    ) VALUES (
      OLD.user_id,
      'UNENROLL',
      'enrollment',
      OLD.id::TEXT,
      jsonb_build_object('deleted_enrollment', row_to_json(OLD)),
      jsonb_build_object('course_id', OLD.course_id)
    );
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      resource_type,
      resource_id,
      changes,
      metadata
    ) VALUES (
      NEW.user_id,
      'ENROLL',
      'enrollment',
      NEW.id::TEXT,
      jsonb_build_object('new_enrollment', row_to_json(NEW)),
      jsonb_build_object('course_id', NEW.course_id)
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to enrollments table
CREATE TRIGGER audit_enrollments_trigger
  AFTER INSERT OR DELETE ON enrollments
  FOR EACH ROW EXECUTE FUNCTION audit_enrollment_changes();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to manually log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_risk_score INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    ip_address,
    user_agent,
    metadata,
    risk_score
  ) VALUES (
    p_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_ip_address,
    p_user_agent,
    p_metadata,
    p_risk_score
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old audit logs (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs
  WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL
    AND risk_score < 30  -- Keep high-risk logs longer
  RETURNING COUNT(*) INTO deleted_count;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE audit_logs IS 'Immutable audit log for security and compliance tracking';
COMMENT ON COLUMN audit_logs.action IS 'Action performed: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource affected: course, lesson, user, enrollment';
COMMENT ON COLUMN audit_logs.changes IS 'JSONB of before/after values for audit trail';
COMMENT ON COLUMN audit_logs.risk_score IS 'Automated risk assessment (0-100, higher = more suspicious)';
COMMENT ON FUNCTION log_security_event IS 'Manually log security-relevant events from application code';
COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Clean up audit logs older than specified days (default 90)';

-- ============================================================================
-- ANALYZE
-- ============================================================================

ANALYZE audit_logs;
