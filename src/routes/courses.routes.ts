import { Router, Response } from 'express';
import { z } from 'zod';
import fetch from 'node-fetch';
import { supabaseAdmin } from '../config/supabase';
import { authenticate, optionalAuth, requireCourseOwner, requireCourseAccess, AuthRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { cache, invalidateCache } from '../middleware/cache.middleware';

const router = Router();

const CLOUDFLARE_BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}`;


function extractVideoIdFromUrl(url: string | null): string | null {
  if (!url) return null;

  // If it's already just a video ID (no slashes or dots), return it as is
  if (!/[\/\.]/.test(url)) {
    return url;
  }

  // Otherwise, try to extract from URL
  const match = url.match(/cloudflarestream\.com\/([a-f0-9]+)\//i);
  return match ? match[1] : null;
}

async function deleteVideoFromCloudflare(videoId: string): Promise<boolean> {
  try {
    console.log(`Attempting to delete video from Cloudflare: ${videoId}`);

    const deleteResponse = await fetch(`${CLOUDFLARE_BASE_URL}/stream/${videoId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${process.env.CLOUDFLARE_STREAM_TOKEN}`,
      },
    });

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      console.error(`Failed to delete video ${videoId} from Cloudflare:`, errorText);
      return false;
    }

    console.log(`Successfully deleted video from Cloudflare: ${videoId}`);
    return true;
  } catch (error) {
    console.error(`Error deleting video ${videoId} from Cloudflare:`, error);
    return false;
  }
}

const createCourseSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  thumbnail_url: z.string().url().optional(),
  category: z.string().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  tags: z.array(z.string()).optional(),
});

const updateCourseSchema = createCourseSchema.partial();

const createLessonSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  video_url: z.string().optional(), // Cloudflare video ID, not a full URL
  content: z.string().optional(),
  order: z.number().int().min(0).optional(),
  duration_minutes: z.number().min(0).optional(), // Accept decimal values for precise duration
  is_free: z.boolean().default(false),
});

const updateLessonSchema = createLessonSchema.partial();

/**
 * @swagger
 * /courses:
 *   get:
 *     tags: [Courses]
 *     summary: List all published courses
 *     description: Retrieve a paginated list of published courses with optional filtering
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *         description: Number of items per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *     responses:
 *       200:
 *         description: List of courses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 courses:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Course'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', optionalAuth, cache({ ttl: 300 }), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 12, category, search } = req.query;

  let query = supabaseAdmin
    .from('courses')
    .select(`
      *,
      instructor:users!courses_instructor_id_fkey(
        id,
        wallet_address,
        display_name,
        avatar_url
      ),
      _count:enrollments(count)
    `)
    .eq('is_published', true);

  if (category) {
    query = query.eq('category', String(category));
  }

  if (search && typeof search === 'string') {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const { data: courses, error, count } = await query
    .range((+page - 1) * +limit, +page * +limit - 1)
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError('Failed to fetch courses', 500);
  }

  res.json({
    courses,
    pagination: {
      page: +page,
      limit: +limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / +limit),
    },
  });
}));

router.get('/enrolled', authenticate, cache({ ttl: 180, includeUserId: true }), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { data: enrollments, error } = await supabaseAdmin
    .from('enrollments')
    .select(`
      *,
      course:courses(
        *,
        instructor:users!courses_instructor_id_fkey(
          id,
          wallet_address,
          display_name
        )
      )
    `)
    .eq('user_id', req.user!.id)
    .order('enrolled_at', { ascending: false });

  if (error) {
    throw new AppError('Failed to fetch enrolled courses', 500);
  }

  res.json({ enrollments });
}));

router.get('/:courseId', optionalAuth, cache({ ttl: 600 }), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { courseId } = req.params;
  
  const { data: course, error } = await supabaseAdmin
    .from('courses')
    .select(`
      *,
      instructor:users!courses_instructor_id_fkey(
        id,
        wallet_address,
        display_name,
        avatar_url
      ),
      lessons(
        id,
        title,
        description,
        order,
        duration_minutes,
        is_free
      ),
      _count:enrollments(count)
    `)
    .eq('id', courseId)
    .single();
  
  if (error || !course) {
    throw new AppError('Course not found', 404);
  }
  
  let hasFullAccess = false;
  if (req.user) {
    if (course.instructor_id === req.user.id) {
      hasFullAccess = true;
    } else {
      const { data: enrollment } = await supabaseAdmin
        .from('enrollments')
        .select('id')
        .eq('user_id', req.user.id)
        .eq('course_id', courseId)
        .single();
      
      hasFullAccess = !!enrollment;
    }
  }
  
  if (course.lessons) {
    course.lessons.sort((a: { order: number }, b: { order: number }) => a.order - b.order);
  }
  
  res.json({
    course,
    hasFullAccess,
  });
}));

router.post('/', authenticate, invalidateCache('cache:*:\/api\/courses*'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const validatedData = createCourseSchema.parse(req.body);
  
  const { data: course, error } = await supabaseAdmin
    .from('courses')
    .insert({
      ...validatedData,
      instructor_id: req.user!.id,
      is_published: false,
    })
    .select()
    .single();
  
  if (error) {
    throw new AppError('Failed to create course', 500);
  }
  
  res.status(201).json({ course });
}));

router.patch('/:courseId', authenticate, requireCourseOwner, invalidateCache('cache:*:\/api\/courses*'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { courseId } = req.params;
  const validatedData = updateCourseSchema.parse(req.body);
  
  const { data: course, error } = await supabaseAdmin
    .from('courses')
    .update(validatedData)
    .eq('id', courseId)
    .select()
    .single();
  
  if (error) {
    throw new AppError('Failed to update course', 500);
  }
  
  res.json({ course });
}));

router.delete('/:courseId', authenticate, requireCourseOwner, invalidateCache('cache:*:\/api\/courses*'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { courseId } = req.params;

  // Get all lessons with videos before deleting the course
  const { data: lessons } = await supabaseAdmin
    .from('lessons')
    .select('id, video_url')
    .eq('course_id', courseId);

  // Delete all videos from Cloudflare Stream
  if (lessons && lessons.length > 0) {
    const deletePromises = lessons
      .filter(lesson => lesson.video_url)
      .map(async (lesson) => {
        const videoId = extractVideoIdFromUrl(lesson.video_url);
        if (videoId) {
          await deleteVideoFromCloudflare(videoId);
          console.log(`Deleted video ${videoId} from lesson ${lesson.id} during course deletion`);
        }
      });

    // Wait for all video deletions to complete
    await Promise.all(deletePromises);
    console.log(`Deleted ${deletePromises.length} videos associated with course ${courseId}`);
  }

  // Delete course from database (CASCADE will delete lessons)
  const { error } = await supabaseAdmin
    .from('courses')
    .delete()
    .eq('id', courseId);

  if (error) {
    throw new AppError('Failed to delete course', 500);
  }

  res.json({ success: true });
}));

router.post('/:courseId/publish', authenticate, requireCourseOwner, invalidateCache('cache:*:\/api\/courses*'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { courseId } = req.params;
  const { publish = true } = req.body;
  
  const { count } = await supabaseAdmin
    .from('lessons')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId);
  
  if (publish && (!count || count === 0)) {
    throw new AppError('Cannot publish course without lessons', 400);
  }
  
  const { data: course, error } = await supabaseAdmin
    .from('courses')
    .update({ is_published: publish })
    .eq('id', courseId)
    .select()
    .single();
  
  if (error) {
    throw new AppError('Failed to update course status', 500);
  }
  
  res.json({ course });
}));

router.get('/:courseId/lessons', authenticate, requireCourseAccess, cache({ ttl: 600 }), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { courseId } = req.params;
  
  const { data: lessons, error } = await supabaseAdmin
    .from('lessons')
    .select('*')
    .eq('course_id', courseId)
    .order('order', { ascending: true });
  
  if (error) {
    throw new AppError('Failed to fetch lessons', 500);
  }
  
  res.json({ lessons });
}));

router.post('/:courseId/lessons', authenticate, requireCourseOwner, invalidateCache('cache:*:\/api\/courses*'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { courseId } = req.params;
  const validatedData = createLessonSchema.parse(req.body);

  const { data: lastLesson } = await supabaseAdmin
      .from('lessons')
      .select('order')
      .eq('course_id', courseId)
      .order('order', { ascending: false })
      .limit(1)
      .maybeSingle();

  const nextOrder = lastLesson ? lastLesson.order + 1 : 0;

  const { data: lesson, error } = await supabaseAdmin
    .from('lessons')
    .insert({
      ...validatedData,
      order: nextOrder,
      course_id: courseId,
    })
    .select()
    .single();

  if (error) {
    throw new AppError('Failed to create lesson', 500);
  }

  res.status(201).json({ lesson });
}));

router.patch('/:courseId/lessons/:lessonId', authenticate, requireCourseOwner, invalidateCache('cache:*:\/api\/courses*'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { courseId, lessonId } = req.params;
  const validatedData = updateLessonSchema.parse(req.body);

  // Verify lesson belongs to course and get current video_url
  const { data: existingLesson } = await supabaseAdmin
    .from('lessons')
    .select('id, video_url')
    .eq('id', lessonId)
    .eq('course_id', courseId)
    .single();

  if (!existingLesson) {
    throw new AppError('Lesson not found', 404);
  }

  // If updating with a new video_url, delete the old video from Cloudflare
  if (validatedData.video_url && existingLesson.video_url && validatedData.video_url !== existingLesson.video_url) {
    const oldVideoId = extractVideoIdFromUrl(existingLesson.video_url);
    const newVideoId = extractVideoIdFromUrl(validatedData.video_url);

    // Only delete if the video IDs are actually different
    if (oldVideoId && newVideoId && oldVideoId !== newVideoId) {
      await deleteVideoFromCloudflare(oldVideoId);
      console.log(`Deleted old video ${oldVideoId} when updating lesson ${lessonId} with new video ${newVideoId}`);
    }
  }

  const { data: lesson, error } = await supabaseAdmin
    .from('lessons')
    .update(validatedData)
    .eq('id', lessonId)
    .select()
    .single();

  if (error) {
    throw new AppError('Failed to update lesson', 500);
  }

  res.json({ lesson });
}));

router.delete('/:courseId/lessons/:lessonId', authenticate, requireCourseOwner, invalidateCache('cache:*:\/api\/courses*'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { courseId, lessonId } = req.params;

  // Verify lesson belongs to course and get video_url
  const { data: existingLesson } = await supabaseAdmin
    .from('lessons')
    .select('id, video_url')
    .eq('id', lessonId)
    .eq('course_id', courseId)
    .single();

  if (!existingLesson) {
    throw new AppError('Lesson not found', 404);
  }

  // Delete video from Cloudflare Stream if exists
  if (existingLesson.video_url) {
    const videoId = extractVideoIdFromUrl(existingLesson.video_url);
    if (videoId) {
      await deleteVideoFromCloudflare(videoId);
      console.log(`Deleted video ${videoId} associated with lesson ${lessonId}`);
    }
  }

  // Delete lesson from database
  const { error } = await supabaseAdmin
    .from('lessons')
    .delete()
    .eq('id', lessonId);

  if (error) {
    throw new AppError('Failed to delete lesson', 500);
  }

  res.json({ success: true });
}));

router.post('/:courseId/enroll', authenticate, invalidateCache('cache:*:\/api\/courses*'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { courseId } = req.params;
  
  const { data: existingEnrollment } = await supabaseAdmin
    .from('enrollments')
    .select('id')
    .eq('user_id', req.user!.id)
    .eq('course_id', courseId)
    .single();
  
  if (existingEnrollment) {
    throw new AppError('Already enrolled in this course', 400);
  }
  
  const { data: course } = await supabaseAdmin
    .from('courses')
    .select('is_published')
    .eq('id', courseId)
    .single();
  
  if (!course || !course.is_published) {
    throw new AppError('Course not available', 404);
  }
  
  const { data: enrollment, error } = await supabaseAdmin
    .from('enrollments')
    .insert({
      user_id: req.user!.id,
      course_id: courseId,
      enrolled_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) {
    throw new AppError('Failed to enroll in course', 500);
  }
  
  res.status(201).json({ enrollment });
}));

export const coursesRouter = router;
