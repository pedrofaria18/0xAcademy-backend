-- =====================================================
-- Migration: Performance Index Optimization
-- Description: Add composite and partial indexes for better query performance
-- Created: 2025-01-23
-- =====================================================

-- ============================================================================
-- COURSES TABLE INDEXES
-- ============================================================================

-- Composite index for published courses with pagination (frequent query)
-- Improves: SELECT * FROM courses WHERE is_published = true ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_courses_published_created
ON courses(is_published, created_at DESC)
WHERE is_published = true;

-- Composite index for category filtering with publication status
-- Improves: SELECT * FROM courses WHERE is_published = true AND category = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_courses_category_published
ON courses(category, is_published, created_at DESC);

-- Full-text search index for course title and description
-- Improves: SELECT * FROM courses WHERE title ILIKE '%search%' OR description ILIKE '%search%'
CREATE INDEX IF NOT EXISTS idx_courses_search
ON courses USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- ============================================================================
-- LESSONS TABLE INDEXES
-- ============================================================================

-- Composite index for lessons by course and order
-- Already exists as idx_lessons_order, but let's ensure it's optimized
-- Improves: SELECT * FROM lessons WHERE course_id = ? ORDER BY "order" ASC

-- Index for free lessons (useful for preview/marketing)
CREATE INDEX IF NOT EXISTS idx_lessons_free
ON lessons(course_id, is_free)
WHERE is_free = true;

-- ============================================================================
-- ENROLLMENTS TABLE INDEXES
-- ============================================================================

-- Composite index for user enrollments with enrollment date
-- Improves: SELECT * FROM enrollments WHERE user_id = ? ORDER BY enrolled_at DESC
CREATE INDEX IF NOT EXISTS idx_enrollments_user_date
ON enrollments(user_id, enrolled_at DESC);

-- Composite index for enrollment lookup
-- Improves: SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?
CREATE INDEX IF NOT EXISTS idx_enrollments_user_course
ON enrollments(user_id, course_id);

-- Index for completed enrollments
-- Improves: SELECT * FROM enrollments WHERE user_id = ? AND completed_at IS NOT NULL
CREATE INDEX IF NOT EXISTS idx_enrollments_completed
ON enrollments(user_id, completed_at)
WHERE completed_at IS NOT NULL;

-- ============================================================================
-- LESSON_PROGRESS TABLE INDEXES
-- ============================================================================

-- Composite index for progress lookup
-- Improves: SELECT * FROM lesson_progress WHERE user_id = ? AND lesson_id = ?
CREATE INDEX IF NOT EXISTS idx_progress_user_lesson
ON lesson_progress(user_id, lesson_id);

-- Composite index for enrollment progress tracking
-- Improves: SELECT * FROM lesson_progress WHERE enrollment_id = ? AND completed = true
CREATE INDEX IF NOT EXISTS idx_progress_enrollment_completed
ON lesson_progress(enrollment_id, completed)
WHERE completed = true;

-- Index for recent progress updates (using completed_at instead of updated_at)
-- Improves: SELECT * FROM lesson_progress WHERE user_id = ? AND completed_at IS NOT NULL ORDER BY completed_at DESC
CREATE INDEX IF NOT EXISTS idx_progress_completed_at
ON lesson_progress(user_id, completed_at DESC)
WHERE completed_at IS NOT NULL;

-- ============================================================================
-- NONCES TABLE INDEXES
-- ============================================================================

-- Composite index for nonce lookup and expiration
-- Improves: SELECT * FROM nonces WHERE address = ? AND expires_at > NOW()
-- Note: Cannot use WHERE with NOW() as it's not IMMUTABLE
CREATE INDEX IF NOT EXISTS idx_nonces_active
ON nonces(address, expires_at DESC);

-- ============================================================================
-- CERTIFICATES TABLE INDEXES
-- ============================================================================

-- Composite index for user certificates with issue date
-- Improves: SELECT * FROM certificates WHERE user_id = ? ORDER BY issued_at DESC
CREATE INDEX IF NOT EXISTS idx_certificates_user_issued
ON certificates(user_id, issued_at DESC);

-- ============================================================================
-- ANALYZE TABLES
-- ============================================================================

-- Update table statistics for query planner optimization
ANALYZE users;
ANALYZE nonces;
ANALYZE courses;
ANALYZE lessons;
ANALYZE enrollments;
ANALYZE lesson_progress;
ANALYZE certificates;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON INDEX idx_courses_published_created IS 'Optimizes published courses listing with pagination';
COMMENT ON INDEX idx_courses_category_published IS 'Optimizes category filtering for published courses';
COMMENT ON INDEX idx_courses_search IS 'Full-text search index for course discovery';
COMMENT ON INDEX idx_lessons_free IS 'Optimizes free lesson queries for course previews';
COMMENT ON INDEX idx_enrollments_user_date IS 'Optimizes user enrollment history queries';
COMMENT ON INDEX idx_enrollments_user_course IS 'Optimizes enrollment verification queries';
COMMENT ON INDEX idx_enrollments_completed IS 'Optimizes completed course queries';
COMMENT ON INDEX idx_progress_user_lesson IS 'Optimizes progress lookup for specific lessons';
COMMENT ON INDEX idx_progress_enrollment_completed IS 'Optimizes completed lesson counting';
COMMENT ON INDEX idx_progress_completed_at IS 'Optimizes recent completed lessons queries';
COMMENT ON INDEX idx_nonces_active IS 'Optimizes nonce lookup and expiration queries';
COMMENT ON INDEX idx_certificates_user_issued IS 'Optimizes certificate history queries';
