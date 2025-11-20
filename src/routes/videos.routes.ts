import { Router } from 'express';
import fetch from 'node-fetch';
import { z } from 'zod';
import { authenticate, requireCourseOwner, AuthRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

const CLOUDFLARE_BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}`;

router.post('/upload-url', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { courseId, lessonId, maxDurationSeconds = 3600 } = req.body;
  
  if (!courseId) {
    throw new AppError('Course ID is required', 400);
  }
  
  const { data: course } = await supabaseAdmin
    .from('courses')
    .select('instructor_id')
    .eq('id', courseId)
    .single();
  
  if (!course || course.instructor_id !== req.user!.id) {
    throw new AppError('Access denied', 403);
  }
  
  const response = await fetch(`${CLOUDFLARE_BASE_URL}/stream/direct_upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CLOUDFLARE_STREAM_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      maxDurationSeconds,
      requireSignedURLs: false,
      allowedOrigins: [process.env.FRONTEND_URL],
      meta: {
        courseId,
        lessonId: lessonId || '',
        userId: req.user!.id,
        uploadedAt: new Date().toISOString(),
      },
    }),
  });
  
  if (!response.ok) {
    console.error('Cloudflare error:', await response.text());
    throw new AppError('Failed to get upload URL', 500);
  }
  
  const data = await response.json() as any;
  
  res.json({
    uploadURL: data.result.uploadURL,
    videoId: data.result.uid,
  });
}));

router.get('/:videoId', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { videoId } = req.params;
  
  const response = await fetch(`${CLOUDFLARE_BASE_URL}/stream/${videoId}`, {
    headers: {
      'Authorization': `Bearer ${process.env.CLOUDFLARE_STREAM_TOKEN}`,
    },
  });
  
  if (!response.ok) {
    throw new AppError('Video not found', 404);
  }
  
  const data = await response.json() as any;
  
  const meta = data.result.meta;
  if (meta && meta.courseId) {
    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('instructor_id')
      .eq('id', meta.courseId)
      .single();
    
    const { data: enrollment } = await supabaseAdmin
      .from('enrollments')
      .select('id')
      .eq('user_id', req.user!.id)
      .eq('course_id', meta.courseId)
      .single();
    
    if (!course || (course.instructor_id !== req.user!.id && !enrollment)) {
      throw new AppError('Access denied', 403);
    }
  }
  
  res.json({
    video: {
      id: data.result.uid,
      playbackUrl: `https://customer-${process.env.CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${data.result.uid}/manifest/video.m3u8`,
      thumbnail: `https://customer-${process.env.CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${data.result.uid}/thumbnails/thumbnail.jpg`,
      status: data.result.status?.state || 'processing',
      duration: data.result.duration,
      size: data.result.size,
      meta: data.result.meta,
    },
  });
}));

router.delete('/:videoId', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { videoId } = req.params;
  
  const videoResponse = await fetch(`${CLOUDFLARE_BASE_URL}/stream/${videoId}`, {
    headers: {
      'Authorization': `Bearer ${process.env.CLOUDFLARE_STREAM_TOKEN}`,
    },
  });
  
  if (!videoResponse.ok) {
    throw new AppError('Video not found', 404);
  }
  
  const videoData = await videoResponse.json() as any;
  const meta = videoData.result.meta;
  
  if (meta && meta.userId !== req.user!.id) {
    throw new AppError('Access denied', 403);
  }
  
  const deleteResponse = await fetch(`${CLOUDFLARE_BASE_URL}/stream/${videoId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${process.env.CLOUDFLARE_STREAM_TOKEN}`,
    },
  });
  
  if (!deleteResponse.ok) {
    throw new AppError('Failed to delete video', 500);
  }
  
  await supabaseAdmin
    .from('lessons')
    .update({ video_url: null })
    .eq('video_url', videoId);
  
  res.json({ success: true });
}));

router.post('/:videoId/signed-url', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { videoId } = req.params;
  const { expiresIn = 3600 } = req.body;
  
  throw new AppError('Signed URLs not implemented yet', 501);
}));

router.post('/webhook', asyncHandler(async (req, res) => {
  const { uid, status, meta } = req.body;
  
  if (status?.state === 'ready' && meta?.lessonId) {
    await supabaseAdmin
      .from('lessons')
      .update({
        video_url: `https://customer-${process.env.CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${uid}/manifest/video.m3u8`,
        duration_minutes: Math.ceil((status.duration || 0) / 60),
      })
      .eq('id', meta.lessonId);
  }
  
  res.json({ received: true });
}));

export const videosRouter = router;
