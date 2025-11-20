import { Router } from 'express';
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

router.post('/nonce', asyncHandler(async (req, res) => {
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

router.post('/verify', asyncHandler(async (req, res) => {
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
    
    let { data: user, error: userError } = await supabaseAdmin
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
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      }
    );
    
    const { data: session, error: sessionError } = await supabaseAdmin.auth.admin.createUser({
      email: `${address}@wallet.local`,
      email_confirm: true,
      user_metadata: {
        wallet_address: address,
      },
    });
    
    res.json({
      token,
      user: {
        id: user.id,
        address: user.wallet_address,
        created_at: user.created_at,
      },
    });
    
  } catch (error) {
    console.error('Verification error:', error);
    throw new AppError('Authentication failed', 401);
  }
}));

router.post('/logout', asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
}));

router.get('/me', asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    throw new AppError('No token provided', 401);
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
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
        address: user.wallet_address,
        created_at: user.created_at,
      },
    });
  } catch (error) {
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
