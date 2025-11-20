import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';
import { authRouter } from './routes/auth.routes';
import { coursesRouter } from './routes/courses.routes';
import { videosRouter } from './routes/videos.routes';
import { userRouter } from './routes/user.routes';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';
import { env } from './utils/validateEnv';

dotenv.config();

// Validate environment variables on startup
// This will throw an error if any required variables are missing

const app = express();
const PORT = env.PORT || 3001;

app.use(helmet());  

app.use(cors({
  origin: env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api/', limiter);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV
  });
});

app.use('/api/auth', authRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/videos', videosRouter);
app.use('/api/user', userRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📱 Environment: ${env.NODE_ENV}`);
  logger.info(`🔗 Frontend URL: ${env.FRONTEND_URL}`);
});

export default app;
