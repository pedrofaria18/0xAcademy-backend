import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface EnvConfig {
  // Supabase
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY: string;

  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;

  // Server
  NODE_ENV: string;
  PORT: string;
  FRONTEND_URL: string;

  // SIWE
  SIWE_DOMAIN: string;
  SIWE_ORIGIN: string;

  // Optional: Cloudflare (for video uploads)
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_STREAM_TOKEN?: string;

  // Optional: Redis (for caching)
  REDIS_HOST?: string;
  REDIS_PORT?: string;
  REDIS_PASSWORD?: string;
  REDIS_DB?: string;

  // Optional: Rate limiting
  RATE_LIMIT_WINDOW_MS?: string;
  RATE_LIMIT_MAX_REQUESTS?: string;
}

/**
 * Required environment variables
 */
const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_KEY',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'NODE_ENV',
  'PORT',
  'FRONTEND_URL',
  'SIWE_DOMAIN',
  'SIWE_ORIGIN'
] as const;

/**
 * Optional environment variables with defaults
 */
const OPTIONAL_ENV_VARS = {
  RATE_LIMIT_WINDOW_MS: '900000',
  RATE_LIMIT_MAX_REQUESTS: '100'
} as const;

/**
 * Validates that all required environment variables are set
 * and have appropriate values
 */
export function validateEnv(): EnvConfig {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
    const value = process.env[varName];

    if (!value || value.trim() === '') {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }

  // Validate specific values
  const supabaseUrl = process.env.SUPABASE_URL;
  if (supabaseUrl && !supabaseUrl.startsWith('http')) {
    errors.push('SUPABASE_URL must be a valid URL starting with http:// or https://');
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long for security');
  }

  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv && !['development', 'production', 'test'].includes(nodeEnv)) {
    warnings.push('NODE_ENV should be one of: development, production, test');
  }

  const port = process.env.PORT;
  if (port && (isNaN(Number(port)) || Number(port) < 1 || Number(port) > 65535)) {
    errors.push('PORT must be a valid number between 1 and 65535');
  }

  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl && !frontendUrl.startsWith('http')) {
    errors.push('FRONTEND_URL must be a valid URL starting with http:// or https://');
  }

  // Check optional Cloudflare config (both or neither)
  const hasCloudflareAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
  const hasCloudflareToken = process.env.CLOUDFLARE_STREAM_TOKEN;

  if ((hasCloudflareAccount && !hasCloudflareToken) || (!hasCloudflareAccount && hasCloudflareToken)) {
    warnings.push('Cloudflare config incomplete: both CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_STREAM_TOKEN are required for video uploads');
  }

  // Display warnings
  if (warnings.length > 0) {
    console.warn('\n⚠️  Environment Variable Warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
    console.warn('');
  }

  // Throw if there are errors
  if (errors.length > 0) {
    console.error('\n❌ Environment Variable Validation Failed:\n');
    errors.forEach(error => console.error(`   - ${error}`));
    console.error('\n💡 Tip: Copy .env.example to .env and fill in the required values\n');
    throw new Error('Environment validation failed. Please check your .env file.');
  }

  // Build config object with defaults
  const config: EnvConfig = {
    SUPABASE_URL: process.env.SUPABASE_URL!,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY!,
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN!,
    NODE_ENV: process.env.NODE_ENV!,
    PORT: process.env.PORT!,
    FRONTEND_URL: process.env.FRONTEND_URL!,
    SIWE_DOMAIN: process.env.SIWE_DOMAIN!,
    SIWE_ORIGIN: process.env.SIWE_ORIGIN!,
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_STREAM_TOKEN: process.env.CLOUDFLARE_STREAM_TOKEN,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    REDIS_DB: process.env.REDIS_DB,
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS || OPTIONAL_ENV_VARS.RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS || OPTIONAL_ENV_VARS.RATE_LIMIT_MAX_REQUESTS
  };

  console.warn('✅ Environment variables validated successfully\n');

  return config;
}

/**
 * Export validated config
 */
export const env = validateEnv();
