import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase';
import { authenticate, optionalAuth, requireCourseOwner, requireCourseAccess, AuthRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';

const router = Router();

const createCourseSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  price_usd: z.number().min(0).optional(),
  thumbnail_url: z.string().url().optional(),
  category: z.string().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  is_public: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
});

const updateCourseSchema = createCourseSchema.partial();

const createLessonSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  video_url: z.string().url().optional(),
  content: z.string().optional(),
  order: z.number().int().min(0),
  duration_minutes: z.number().int().min(0).optional(),
  is_free: z.boolean().default(false),
});

router.get('/', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
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
    query = query.eq('category', category);
  }
  
  if (search) {
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

router.get('/:courseId', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
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
    course.lessons.sort((a: any, b: any) => a.order - b.order);
  }
  
  res.json({
    course,
    hasFullAccess,
  });
}));

router.post('/', authenticate, asyncHandler(async (req: AuthRequest, res) => {
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

router.patch('/:courseId', authenticate, requireCourseOwner, asyncHandler(async (req: AuthRequest, res) => {
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

router.delete('/:courseId', authenticate, requireCourseOwner, asyncHandler(async (req: AuthRequest, res) => {
  const { courseId } = req.params;
  
  const { error } = await supabaseAdmin
    .from('courses')
    .delete()
    .eq('id', courseId);
  
  if (error) {
    throw new AppError('Failed to delete course', 500);
  }
  
  res.json({ success: true });
}));

router.post('/:courseId/publish', authenticate, requireCourseOwner, asyncHandler(async (req: AuthRequest, res) => {
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

router.get('/:courseId/lessons', authenticate, requireCourseAccess, asyncHandler(async (req: AuthRequest, res) => {
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

router.post('/:courseId/lessons', authenticate, requireCourseOwner, asyncHandler(async (req: AuthRequest, res) => {
  const { courseId } = req.params;
  const validatedData = createLessonSchema.parse(req.body);
  
  const { data: lesson, error } = await supabaseAdmin
    .from('lessons')
    .insert({
      ...validatedData,
      course_id: courseId,
    })
    .select()
    .single();
  
  if (error) {
    throw new AppError('Failed to create lesson', 500);
  }
  
  res.status(201).json({ lesson });
}));

router.post('/:courseId/enroll', authenticate, asyncHandler(async (req: AuthRequest, res) => {
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
    .select('is_published, price_usd')
    .eq('id', courseId)
    .single();
  
  if (!course || !course.is_published) {
    throw new AppError('Course not available', 404);
  }
  
  if (course.price_usd && course.price_usd > 0) {
    throw new AppError('Payment processing not yet implemented', 501);
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
  
router.get('/enrolled', authenticate, asyncHandler(async (req: AuthRequest, res) => {
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

export const coursesRouter = router;
