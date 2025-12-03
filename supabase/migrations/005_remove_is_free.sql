-- =====================================================
-- Migration: Remove is_free from lessons
-- Description: Remove is_free column as all content is free
-- Created: 2025-12-03
-- =====================================================

-- Drop the policy that uses is_free
DROP POLICY IF EXISTS "Free lessons are viewable by everyone" ON lessons;

-- Drop the index that uses is_free
DROP INDEX IF EXISTS idx_lessons_free;

-- Remove is_free column from lessons table
ALTER TABLE lessons DROP COLUMN IF EXISTS is_free;

-- Since all lessons are now free by default, update the policy
-- to allow everyone to view lessons if they're enrolled
CREATE POLICY "Enrolled users can view all lessons" ON lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.user_id = auth.uid()::uuid
      AND enrollments.course_id = lessons.course_id
    )
  );

-- Analyze
ANALYZE lessons;
