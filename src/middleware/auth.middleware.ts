import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors';
import { supabaseAdmin } from '../config/supabase';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    address: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      throw new AppError('Authentication required', 401);
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, wallet_address')
      .eq('id', decoded.id)
      .single();
    
    if (error || !user) {
      throw new AppError('User not found', 401);
    }
    
    req.user = {
      id: user.id,
      address: user.wallet_address,
    };
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Token expired', 401));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401));
    } else {
      next(error);
    }
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next();
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, wallet_address')
      .eq('id', decoded.id)
      .single();
    
    if (user) {
      req.user = {
        id: user.id,
        address: user.wallet_address,
      };
    }
    
    next();
  } catch (error) {
    next();
  }
};

export const requireCourseOwner = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }
    
    const courseId = req.params.courseId;
    
    const { data: course, error } = await supabaseAdmin
      .from('courses')
      .select('instructor_id')
      .eq('id', courseId)
      .single();
    
    if (error || !course) {
      throw new AppError('Course not found', 404);
    }
    
    if (course.instructor_id !== req.user.id) {
      throw new AppError('Access denied', 403);
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

export const requireCourseAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }
    
    const courseId = req.params.courseId;
    
    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('instructor_id, is_public')
      .eq('id', courseId)
      .single();
    
    if (!course) {
      throw new AppError('Course not found', 404);
    }
    
    if (course.is_public) {
      return next();
    }
    
    if (course.instructor_id === req.user.id) {
      return next();
    }
    
    const { data: enrollment } = await supabaseAdmin
      .from('enrollments')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('course_id', courseId)
      .single();
    
    if (!enrollment) {
      throw new AppError('Access denied. Please enroll in this course.', 403);
    }
    
    next();
  } catch (error) {
    next(error);
  }
};
