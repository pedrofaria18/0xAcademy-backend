import { Router, Request, Response } from 'express';
import { SiweMessage } from 'siwe';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { z } from 'zod';

const router = Router();

const nonceRequestSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

const verifySchema = z.object({
  message: z.string(),
  signature: z.string(),
});

/**
 * @swagger
 * /auth/nonce:
 *   post:
 *     tags: [Authentication]
 *     summary: Request a nonce for wallet authentication
 *     description: Generates a unique nonce for Sign-In with Ethereum (SIWE) authentication. The nonce expires in 10 minutes.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *             properties:
 *               address:
 *                 type: string
 *                 pattern: ^0x[a-fA-F0-9]{40}$
 *                 example: "0x1234567890abcdef1234567890abcdef12345678"
 *     responses:
 *       200:
 *         description: Nonce generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 nonce:
 *                   type: string
 *                   example: "Ab3Cd5Ef7Gh9Ij1Kl"
 *       400:
 *         description: Invalid wallet address format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/nonce', asyncHandler(async (req: Request, res: Response) => {
  const { address } = nonceRequestSchema.parse(req.body);
  
  const nonce = generateNonce();
  
  const { error } = await supabaseAdmin
    .from('nonces')
    .insert({
      address: address.toLowerCase(),
      nonce,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

  if (error) {
    throw new AppError('Failed to generate nonce', 500);
  }

  res.json({ nonce });
}));

/**
 * @swagger
 * /auth/verify:
 *   post:
 *     tags: [Authentication]
 *     summary: Verify SIWE signature and authenticate user
 *     description: Verifies a signed SIWE message and returns a JWT token. Creates a new user if wallet address doesn't exist.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *               - signature
 *             properties:
 *               message:
 *                 type: string
 *                 description: SIWE formatted message
 *                 example: "localhost:3000 wants you to sign in with your Ethereum account..."
 *               signature:
 *                 type: string
 *                 description: Signature from wallet
 *                 example: "0x..."
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token valid for 7 days
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid signature or expired nonce
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/verify', asyncHandler(async (req: Request, res: Response) => {
  const { message, signature } = verifySchema.parse(req.body);
  
  try {
    const siweMessage = new SiweMessage(message);
    
    const fields = await siweMessage.verify({ signature });
    
    if (!fields.success) {
      throw new AppError('Invalid signature', 401);
    }
    
    const address = fields.data.address.toLowerCase();
    
    const { data: nonceData, error: nonceError } = await supabaseAdmin
      .from('nonces')
      .select('*')
      .eq('address', address)
      .eq('nonce', fields.data.nonce)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (nonceError || !nonceData) {
      throw new AppError('Invalid or expired nonce', 401);
    }
    
    await supabaseAdmin
      .from('nonces')
      .delete()
      .eq('id', nonceData.id);
    
    let { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('wallet_address', address)
      .single();
    
    if (!user) {
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          wallet_address: address,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (createError) {
        throw new AppError('Failed to create user', 500);
      }
      
      user = newUser;
    } else {
      await supabaseAdmin
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);
    }
    
    const token = jwt.sign(
      {
        id: user.id,
        address: user.wallet_address,
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: '7d',
      }
    );

    await supabaseAdmin.auth.admin.createUser({
      email: `${address}@wallet.local`,
      email_confirm: true,
      user_metadata: {
        wallet_address: address,
      },
    }).catch(() => {
      // User might already exist in auth, ignore error
    });
    
    res.json({
      token,
      user: {
        id: user.id,
        wallet_address: user.wallet_address,
        address: user.wallet_address,
        display_name: user.display_name,
        bio: user.bio,
        avatar_url: user.avatar_url,
        social_links: user.social_links,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
    
  } catch (error) {
    console.error('Verification error:', error);
    throw new AppError('Authentication failed', 401);
  }
}));

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout user
 *     description: Client-side logout endpoint (token should be removed from client storage)
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully"
 */
router.post('/logout', asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Logged out successfully' });
}));

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Get current authenticated user
 *     description: Returns the current user's profile information based on JWT token
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/me', asyncHandler(async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    throw new AppError('No token provided', 401);
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; address: string };

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      user: {
        id: user.id,
        wallet_address: user.wallet_address,
        address: user.wallet_address,
        display_name: user.display_name,
        role: user.role,
        bio: user.bio,
        avatar_url: user.avatar_url,
        social_links: user.social_links,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (_error) {
    throw new AppError('Invalid token', 401);
  }
}));

function generateNonce(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < length; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

export const authRouter = router;
