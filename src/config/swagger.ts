import swaggerJsdoc from 'swagger-jsdoc';
import { env } from '../utils/validateEnv';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '0xAcademy API',
      version: '1.0.0',
      description: 'API documentation for 0xAcademy - Web3 Learning Platform',
      contact: {
        name: '0xAcademy',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT || 3001}/api`,
        description: 'Development server',
      },
      {
        url: '/api',
        description: 'Current server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from /auth/verify endpoint',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              example: 'Error message',
            },
            message: {
              type: 'string',
              example: 'Detailed error description',
            },
            statusCode: {
              type: 'number',
              example: 400,
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            wallet_address: {
              type: 'string',
              example: '0x1234567890abcdef1234567890abcdef12345678',
            },
            address: {
              type: 'string',
              example: '0x1234567890abcdef1234567890abcdef12345678',
              description: 'Alias for wallet_address',
            },
            display_name: {
              type: 'string',
              nullable: true,
            },
            bio: {
              type: 'string',
              nullable: true,
            },
            avatar_url: {
              type: 'string',
              nullable: true,
            },
            social_links: {
              type: 'object',
              nullable: true,
              properties: {
                twitter: { type: 'string' },
                github: { type: 'string' },
                linkedin: { type: 'string' },
                website: { type: 'string' },
              },
            },
            created_at: {
              type: 'string',
              format: 'date-time',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
          },
        },
        Course: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            title: {
              type: 'string',
            },
            description: {
              type: 'string',
            },
            thumbnail_url: {
              type: 'string',
              nullable: true,
            },
            price_usd: {
              type: 'number',
              nullable: true,
            },
            category: {
              type: 'string',
              nullable: true,
            },
            level: {
              type: 'string',
              enum: ['beginner', 'intermediate', 'advanced'],
              nullable: true,
            },
            is_published: {
              type: 'boolean',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              nullable: true,
            },
            instructor_id: {
              type: 'string',
              format: 'uuid',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            instructor: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                wallet_address: { type: 'string' },
                display_name: { type: 'string', nullable: true },
                avatar_url: { type: 'string', nullable: true },
              },
            },
            lessons: {
              type: 'array',
              items: { $ref: '#/components/schemas/Lesson' },
            },
            _count: {
              type: 'object',
              properties: {
                count: { type: 'number' },
              },
            },
          },
        },
        Lesson: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            course_id: {
              type: 'string',
              format: 'uuid',
            },
            title: {
              type: 'string',
            },
            description: {
              type: 'string',
              nullable: true,
            },
            video_url: {
              type: 'string',
              nullable: true,
            },
            content: {
              type: 'string',
              nullable: true,
            },
            order: {
              type: 'number',
            },
            duration_minutes: {
              type: 'number',
              nullable: true,
            },
            is_free: {
              type: 'boolean',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Enrollment: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            user_id: {
              type: 'string',
              format: 'uuid',
            },
            course_id: {
              type: 'string',
              format: 'uuid',
            },
            enrolled_at: {
              type: 'string',
              format: 'date-time',
            },
            course: {
              $ref: '#/components/schemas/Course',
            },
          },
        },
        Progress: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            user_id: {
              type: 'string',
              format: 'uuid',
            },
            lesson_id: {
              type: 'string',
              format: 'uuid',
            },
            enrollment_id: {
              type: 'string',
              format: 'uuid',
            },
            completed: {
              type: 'boolean',
            },
            completed_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
          },
        },
        Certificate: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            user_id: {
              type: 'string',
              format: 'uuid',
            },
            course_id: {
              type: 'string',
              format: 'uuid',
            },
            issued_at: {
              type: 'string',
              format: 'date-time',
            },
            certificate_hash: {
              type: 'string',
              nullable: true,
            },
            nft_token_id: {
              type: 'string',
              nullable: true,
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Web3 authentication endpoints using Sign-In with Ethereum (SIWE)',
      },
      {
        name: 'Courses',
        description: 'Course management and enrollment endpoints',
      },
      {
        name: 'User',
        description: 'User profile and progress tracking endpoints',
      },
      {
        name: 'Videos',
        description: 'Video upload and management with Cloudflare Stream',
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/docs/*.ts',
  ], // Path to the API routes and documentation files
};

export const swaggerSpec = swaggerJsdoc(options);
