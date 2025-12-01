import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { AppError } from '../utils/errors';
import { supabaseAdmin } from '../config/supabase';

export type UserRole = 'student' | 'instructor' | 'admin';

/**
 * Extended AuthRequest with role information
 */
export interface RoleAuthRequest extends AuthRequest {
  user?: {
    id: string;
    address: string;
    isInstructor?: boolean;
    isAdmin?: boolean;
    role?: UserRole;
  };
}

/**
 * Middleware to check if user is an instructor
 */
export const requireInstructor = async (
  req: RoleAuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('is_instructor')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      throw new AppError('User not found', 404);
    }

    if (!user.is_instructor) {
      throw new AppError('Instructor access required', 403);
    }

    req.user.isInstructor = true;
    req.user.role = 'instructor';

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if user is an admin
 */
export const requireAdmin = async (
  req: RoleAuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      throw new AppError('User not found', 404);
    }

    if (!user.is_admin) {
      throw new AppError('Admin access required', 403);
    }

    req.user.isAdmin = true;
    req.user.role = 'admin';

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if user has specific role
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return async (req: RoleAuthRequest, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('is_instructor, is_admin')
        .eq('id', req.user.id)
        .single();

      if (error || !user) {
        throw new AppError('User not found', 404);
      }

      let userRole: UserRole = 'student';
      if (user.is_admin) {
        userRole = 'admin';
      } else if (user.is_instructor) {
        userRole = 'instructor';
      }

      if (!allowedRoles.includes(userRole)) {
        throw new AppError(
          `Access denied. Required role: ${allowedRoles.join(' or ')}`,
          403
        );
      }

      req.user.role = userRole;
      req.user.isInstructor = user.is_instructor ?? false;
      req.user.isAdmin = user.is_admin ?? false;

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user is instructor OR admin
 */
export const requireInstructorOrAdmin = async (
  req: RoleAuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('is_instructor, is_admin')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      throw new AppError('User not found', 404);
    }

    if (!user.is_instructor && !user.is_admin) {
      throw new AppError('Instructor or Admin access required', 403);
    }

    req.user.isInstructor = user.is_instructor ?? false;
    req.user.isAdmin = user.is_admin ?? false;
    req.user.role = user.is_admin ? 'admin' : 'instructor';

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to load user role information (doesn't require specific role)
 */
export const loadUserRole = async (
  req: RoleAuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next();
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('is_instructor, is_admin')
      .eq('id', req.user.id)
      .single();

    if (user) {
      req.user.isInstructor = user.is_instructor ?? false;
      req.user.isAdmin = user.is_admin ?? false;

      if (user.is_admin) {
        req.user.role = 'admin';
      } else if (user.is_instructor) {
        req.user.role = 'instructor';
      } else {
        req.user.role = 'student';
      }
    }

    next();
  } catch (_error) {
    next();
  }
};
