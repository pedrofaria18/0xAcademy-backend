import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { authRouter } from './routes/auth.routes';
import { coursesRouter } from './routes/courses.routes';
import { videosRouter } from './routes/videos.routes';
import { userRouter } from './routes/user.routes';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';
import { env } from './utils/validateEnv';
import { swaggerSpec } from './config/swagger';
import { connectRedis } from './config/redis';

dotenv.config();

const app = express();
const PORT = env.PORT || 3001;

// Connect to Redis (optional - will warn if unavailable)
try {
  connectRedis();
} catch (error) {
  logger.warn('Redis not available, continuing without cache');
}

// Compression middleware (gzip/brotli)
app.use(compression({
  level: 6, // Compression level (0-9, higher = better compression but slower)
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Don't compress if the client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression filter
    return compression.filter(req, res);
  },
}));

// Configure helmet to allow Swagger UI resources
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));  

app.use(cors({
  origin: env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api/', limiter);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV
  });
});

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: '0xAcademy API Documentation',
}));

// Serve swagger.json
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use('/api/auth', authRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/videos', videosRouter);
app.use('/api/user', userRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📱 Environment: ${env.NODE_ENV}`);
  logger.info(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
});

export default app;
