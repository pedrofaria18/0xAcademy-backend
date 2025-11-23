-- Add role to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin'));

-- Create index for role queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Update existing users who are already instructors (have created courses)
UPDATE users
SET role = 'instructor'
WHERE id IN (
  SELECT DISTINCT instructor_id
  FROM courses
  WHERE instructor_id IS NOT NULL
);
