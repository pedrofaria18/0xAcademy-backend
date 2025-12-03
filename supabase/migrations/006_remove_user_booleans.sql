-- =====================================================
-- Migration: Remove is_instructor and is_admin booleans
-- Description: Remove boolean columns and use only role column
-- Created: 2025-12-03
-- =====================================================

-- Drop functions that use the boolean columns
DROP FUNCTION IF EXISTS user_has_role(UUID, TEXT);
DROP FUNCTION IF EXISTS promote_to_instructor(UUID);
DROP FUNCTION IF EXISTS promote_to_admin(UUID);

-- Drop indexes for the boolean columns
DROP INDEX IF EXISTS idx_users_instructor;
DROP INDEX IF EXISTS idx_users_admin;

-- Remove boolean columns from users table
ALTER TABLE users DROP COLUMN IF EXISTS is_instructor;
ALTER TABLE users DROP COLUMN IF EXISTS is_admin;

-- Create new functions that work with role column
CREATE OR REPLACE FUNCTION promote_to_instructor(user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE users
  SET role = 'instructor'
  WHERE id = user_id_param;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION promote_to_admin(user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE users
  SET role = 'admin'
  WHERE id = user_id_param;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION user_has_role(user_id_param UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM users WHERE id = user_id_param;

  RETURN COALESCE(user_role = role_name, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for role queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE role IS NOT NULL;

-- Comments
COMMENT ON COLUMN users.role IS 'User role: student, instructor, or admin';
COMMENT ON FUNCTION promote_to_instructor IS 'Promote a user to instructor role';
COMMENT ON FUNCTION promote_to_admin IS 'Promote a user to admin role';
COMMENT ON FUNCTION user_has_role IS 'Check if user has a specific role';

-- Analyze
ANALYZE users;
