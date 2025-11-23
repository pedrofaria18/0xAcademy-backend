-- Remove is_public column from courses table
-- This field was redundant with is_published
ALTER TABLE courses DROP COLUMN IF EXISTS is_public;
