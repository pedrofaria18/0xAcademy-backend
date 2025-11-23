import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().optional(),
  social_links: z.object({
    twitter: z.string().optional(),
    github: z.string().optional(),
    linkedin: z.string().optional(),
    website: z.string().url().optional(),
  }).optional(),
});

router.get('/profile', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select(`
      *,
      _count:courses!courses_instructor_id_fkey(count),
      _enrolled:enrollments(count)
    `)
    .eq('id', req.user!.id)
    .single();
  
  if (error || !user) {
    throw new AppError('User not found', 404);
  }
  
  res.json({ user });
}));

router.patch('/profile', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const validatedData = updateProfileSchema.parse(req.body);
  
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .update({
      ...validatedData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.user!.id)
    .select()
    .single();
  
  if (error) {
    throw new AppError('Failed to update profile', 500);
  }
  
  res.json({ user });
}));

router.get('/teaching', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { data: courses, error } = await supabaseAdmin
    .from('courses')
    .select(`
      *,
      _count:enrollments(count),
      _lessons:lessons(count)
    `)
    .eq('instructor_id', req.user!.id)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new AppError('Failed to fetch courses', 500);
  }
  
  res.json({ courses });
}));

router.get('/progress', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { data: enrollments, error } = await supabaseAdmin
    .from('enrollments')
    .select(`
      *,
      course:courses(
        id,
        title,
        thumbnail_url,
        _total_lessons:lessons(count)
      ),
      progress:lesson_progress(
        lesson_id,
        completed,
        completed_at
      )
    `)
    .eq('user_id', req.user!.id);
  
  if (error) {
    throw new AppError('Failed to fetch progress', 500);
  }
  
  const progressData = enrollments.map((enrollment: any) => {
    const totalLessons = enrollment.course?._total_lessons?.[0]?.count || 0;
    const completedLessons = enrollment.progress?.filter((p: any) => p.completed).length || 0;
    const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    return {
      ...enrollment,
      progressPercentage,
      completedLessons,
      totalLessons,
    };
  });
  
  res.json({ progress: progressData });
}));

router.post('/progress/lesson/:lessonId', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { lessonId } = req.params;
  const { completed = true } = req.body;
  
  const { data: lesson } = await supabaseAdmin
    .from('lessons')
    .select('course_id')
    .eq('id', lessonId)
    .single();

  if (!lesson?.course_id) {
    throw new AppError('Lesson not found', 404);
  }

  const { data: enrollment } = await supabaseAdmin
    .from('enrollments')
    .select('id')
    .eq('user_id', req.user!.id)
    .eq('course_id', lesson.course_id)
    .single();
  
  if (!enrollment) {
    throw new AppError('Not enrolled in this course', 403);
  }
  
  const { data: progress, error } = await supabaseAdmin
    .from('lesson_progress')
    .upsert({
      user_id: req.user!.id,
      lesson_id: lessonId,
      enrollment_id: enrollment.id,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    }, {
      onConflict: 'user_id,lesson_id',
    })
    .select()
    .single();
  
  if (error) {
    throw new AppError('Failed to update progress', 500);
  }
  
  const { data: allProgress } = await supabaseAdmin
    .from('lesson_progress')
    .select('completed')
    .eq('enrollment_id', enrollment.id);
  
  const { data: totalLessons } = await supabaseAdmin
    .from('lessons')
    .select('id')
    .eq('course_id', lesson.course_id);
  
  const allCompleted = allProgress?.length === totalLessons?.length &&
                       allProgress?.every((p: any) => p.completed);
  
  res.json({ 
    progress,
    courseCompleted: allCompleted,
  });
}));

router.get('/certificates', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { data: certificates, error } = await supabaseAdmin
    .from('certificates')
    .select(`
      *,
      course:courses(
        id,
        title,
        instructor:users!courses_instructor_id_fkey(
          display_name,
          wallet_address
        )
      )
    `)
    .eq('user_id', req.user!.id)
    .order('issued_at', { ascending: false });

  if (error) {
    throw new AppError('Failed to fetch certificates', 500);
  }

  res.json({ certificates });
}));

router.post('/become-instructor', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { data: currentUser } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', req.user!.id)
    .single();

  if (currentUser?.role === 'instructor') {
    throw new AppError('User is already an instructor', 400);
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .update({
      role: 'instructor',
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.user!.id)
    .select()
    .single();

  if (error) {
    throw new AppError('Failed to become instructor', 500);
  }

  res.json({
    user,
    message: 'Successfully became an instructor'
  });
}));

router.get('/:address', asyncHandler(async (req: Request, res: Response) => {
  const { address } = req.params;
  
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select(`
      id,
      wallet_address,
      display_name,
      bio,
      avatar_url,
      social_links,
      created_at,
      courses:courses!courses_instructor_id_fkey(
        id,
        title,
        description,
        thumbnail_url,
        price_usd,
        is_published,
        _count:enrollments(count)
      )
    `)
    .eq('wallet_address', address.toLowerCase())
    .single();
  
  if (error || !user) {
    throw new AppError('User not found', 404);
  }
  
  user.courses = user.courses.filter((course: any) => course.is_published);
  
  res.json({ user });
}));

export const userRouter = router;
