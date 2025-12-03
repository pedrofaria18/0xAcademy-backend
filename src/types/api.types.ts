// API Response Types
// These types should match the frontend expectations

export interface UserResponse {
  id: string;
  wallet_address: string;
  address: string; // Alias for wallet_address for compatibility
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  social_links?: {
    twitter?: string;
    github?: string;
    linkedin?: string;
    website?: string;
  };
  role?: string;
  created_at: string;
  updated_at?: string;
}

export interface AuthVerifyResponse {
  token: string;
  user: UserResponse;
}

export interface AuthMeResponse {
  user: UserResponse;
}

export interface NonceResponse {
  nonce: string;
}

export interface CourseResponse {
  id: string;
  title: string;
  description: string;
  thumbnail_url?: string;
  category?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  is_published: boolean;
  tags?: string[];
  instructor_id: string;
  created_at: string;
  updated_at?: string;
  instructor?: {
    id: string;
    wallet_address: string;
    display_name?: string;
    avatar_url?: string;
  };
  lessons?: LessonResponse[];
  _count?: {
    count: number;
  };
}

export interface LessonResponse {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  video_url?: string;
  content?: string;
  order: number;
  duration_minutes?: number;
  created_at: string;
  updated_at?: string;
}

export interface EnrollmentResponse {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  course?: CourseResponse;
}

export interface ProgressResponse {
  id: string;
  user_id: string;
  lesson_id: string;
  enrollment_id: string;
  completed: boolean;
  completed_at?: string;
}

export interface CertificateResponse {
  id: string;
  user_id: string;
  course_id: string;
  issued_at: string;
  certificate_url?: string;
  course?: {
    id: string;
    title: string;
    instructor?: {
      display_name?: string;
      wallet_address: string;
    };
  };
}

export interface VideoResponse {
  id: string;
  playbackUrl: string;
  thumbnail: string;
  status: string;
  duration?: number;
  size?: number;
  meta?: Record<string, any>;
}

export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface CoursesListResponse {
  courses: CourseResponse[];
  pagination: PaginationResponse;
}

export interface UploadUrlResponse {
  uploadURL: string;
  videoId: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}
