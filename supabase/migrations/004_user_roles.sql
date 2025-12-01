-- =====================================================
-- Migration: User Roles System
-- Description: Add role fields to users table
-- Created: 2025-01-23
-- =====================================================

-- Add role columns to users table if they don't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_instructor BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create index for role queries
CREATE INDEX IF NOT EXISTS idx_users_instructor ON users(is_instructor) WHERE is_instructor = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_admin ON users(is_admin) WHERE is_admin = TRUE;

-- Create function to promote user to instructor
CREATE OR REPLACE FUNCTION promote_to_instructor(user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE users
  SET is_instructor = TRUE
  WHERE id = user_id_param;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to promote user to admin
CREATE OR REPLACE FUNCTION promote_to_admin(user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE users
  SET is_admin = TRUE
  WHERE id = user_id_param;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user has role
CREATE OR REPLACE FUNCTION user_has_role(user_id_param UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  has_role BOOLEAN;
BEGIN
  CASE role_name
    WHEN 'admin' THEN
      SELECT is_admin INTO has_role FROM users WHERE id = user_id_param;
    WHEN 'instructor' THEN
      SELECT is_instructor INTO has_role FROM users WHERE id = user_id_param;
    WHEN 'student' THEN
      has_role := TRUE;  -- All users are students by default
    ELSE
      has_role := FALSE;
  END CASE;

  RETURN COALESCE(has_role, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON COLUMN users.is_instructor IS 'Whether user can create and manage courses';
COMMENT ON COLUMN users.is_admin IS 'Whether user has admin privileges';
COMMENT ON FUNCTION promote_to_instructor IS 'Promote a user to instructor role';
COMMENT ON FUNCTION promote_to_admin IS 'Promote a user to admin role';
COMMENT ON FUNCTION user_has_role IS 'Check if user has a specific role';

-- Analyze
ANALYZE users;
