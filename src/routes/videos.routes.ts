import { Router, Response, Request } from 'express';
import fetch from 'node-fetch';
import crypto from 'crypto';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

const CLOUDFLARE_BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}`;

router.post('/upload-url', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { courseId, lessonId, maxDurationSeconds = 3600 } = req.body;

  console.log('📹 Upload URL requested:', { courseId, lessonId });

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

  const cloudflareUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/direct_upload`;

  // Build metadata object for webhook
  const metadata: Record<string, string> = {
    userId: req.user!.id,
    courseId: courseId,
  };

  // Include lessonId if provided (for updating existing lessons)
  if (lessonId) {
    metadata.lessonId = lessonId;
    console.log('✅ LessonId included in metadata:', lessonId);
  } else {
    console.log('⚠️  No lessonId provided - webhook will not update lesson');
  }

  const response = await fetch(cloudflareUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CLOUDFLARE_STREAM_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      maxDurationSeconds,
      requireSignedURLs: false,
      meta: metadata, // Critical: Include metadata for webhook
    }),
  });

  console.log('HEADER ENVIADO:', {
    authorization: `Bearer ${process.env.CLOUDFLARE_STREAM_TOKEN}`
  });
  
  if (!response.ok) {
    console.error('Cloudflare error:', await response.text());
    throw new AppError('Failed to get upload URL', 500);
  }
  
  const data = await response.json() as any;
  const videoId = data.result.uid;

  res.json({
    uploadURL: data.result.uploadURL,
    videoId: videoId,
  });
}));

router.get('/:videoId', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
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
      playbackUrl: `https://customer-${process.env.CLOUDFLARE_CUSTOMER_SUBDOMAIN}.cloudflarestream.com/${data.result.uid}/watch`,
      thumbnail: `https://customer-${process.env.CLOUDFLARE_CUSTOMER_SUBDOMAIN}.cloudflarestream.com/${data.result.uid}/thumbnails/thumbnail.jpg`,
      status: data.result.status?.state || 'processing',
      duration: data.result.duration,
      size: data.result.size,
      meta: data.result.meta,
    },
  });
}));

router.delete('/:videoId', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
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

router.post('/:videoId/signed-url', authenticate, asyncHandler(async (_req: AuthRequest, _res: Response) => {
  throw new AppError('Signed URLs not implemented yet', 501);
}));

/**
 * Verify Cloudflare webhook signature
 */
function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  if (!signature || !secret) {
    return false;
  }

  // Parse signature header: "time=1230811200,sig1=..."
  const parts = signature.split(',');
  const timeMatch = parts.find(p => p.startsWith('time='));
  const sigMatch = parts.find(p => p.startsWith('sig1='));

  if (!timeMatch || !sigMatch) {
    return false;
  }

  const timestamp = timeMatch.split('=')[1];
  const expectedSig = sigMatch.split('=')[1];

  // Check if timestamp is not too old (e.g., within 5 minutes)
  const currentTime = Math.floor(Date.now() / 1000);
  const requestTime = parseInt(timestamp, 10);
  if (Math.abs(currentTime - requestTime) > 300) {
    console.warn('Webhook timestamp too old:', currentTime - requestTime, 'seconds');
    return false;
  }

  // Create signature source: timestamp + '.' + body
  const signatureSource = `${timestamp}.${body}`;

  // Compute HMAC-SHA256
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(signatureSource);
  const computedSig = hmac.digest('hex');

  // Compare signatures using constant-time comparison
  return crypto.timingSafeEqual(
    Buffer.from(computedSig),
    Buffer.from(expectedSig)
  );
}

router.post('/webhook', asyncHandler(async (req: Request, res: Response) => {
  // Verify webhook signature if secret is configured
  if (process.env.CLOUDFLARE_WEBHOOK_SECRET) {
    const signature = req.headers['webhook-signature'] as string;
    const body = JSON.stringify(req.body);

    const isValid = verifyWebhookSignature(
      body,
      signature,
      process.env.CLOUDFLARE_WEBHOOK_SECRET
    );

    if (!isValid) {
      console.error('Invalid webhook signature');
      throw new AppError('Invalid webhook signature', 401);
    }
  } else {
    console.warn('CLOUDFLARE_WEBHOOK_SECRET not configured - webhook signature not verified');
  }

  const { uid, status, meta, readyToStream } = req.body;

  console.log('🔔 Webhook received:', {
    uid,
    state: status?.state,
    readyToStream,
    metadata: meta,
  });

  // Handle successful video processing
  if (status?.state === 'ready' && readyToStream) {
    if (meta?.lessonId) {
      console.log('✅ Video ready for streaming, updating lesson:', uid);

      const { data, error } = await supabaseAdmin
        .from('lessons')
        .update({
          video_url: uid, // Save only the videoId
          duration_minutes: status.duration ? status.duration / 60 : null, // Save exact duration in minutes (decimal)
        })
        .eq('id', meta.lessonId)
        .select();

      if (error) {
        console.error('❌ Error updating lesson:', error);
      } else {
        console.log('✅ Lesson updated successfully:', data);
      }
    } else {
      console.log('⚠️  Video ready but NO lessonId in metadata - skipping lesson update');
      console.log('   Metadata received:', meta);
    }
  }

  // Handle video processing errors
  if (status?.state === 'error') {
    console.error('Video processing error:', {
      uid,
      code: status.errReasonCode,
      text: status.errReasonText,
      lessonId: meta?.lessonId,
    });

    // Optionally update lesson to indicate error
    if (meta?.lessonId) {
      await supabaseAdmin
        .from('lessons')
        .update({
          video_url: null,
          // Could add an error field if schema supports it
        })
        .eq('id', meta.lessonId);
    }
  }

  res.json({ received: true });
}));

export const videosRouter = router;
