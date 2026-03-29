import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

// Load .env file in development. Safe to fail in production.
dotenvConfig();

/**
 * In production, all keys are required. In development, all keys default to
 * empty/placeholder values so the server boots with ZERO env vars set.
 */
const isDev = !process.env['NODE_ENV'] || process.env['NODE_ENV'] === 'development';

const optionalInDev = (schema: z.ZodString) =>
  isDev ? schema.default('') : schema.min(1);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: optionalInDev(z.string()),
  REDIS_URL: optionalInDev(z.string()),
  JWT_SECRET: isDev ? z.string().default('dev-jwt-secret-change-in-production-must-be-32-chars') : z.string().min(32),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  APP_URL: z.string().default('http://localhost:3001'),
  TWILIO_ACCOUNT_SID: optionalInDev(z.string()),
  TWILIO_AUTH_TOKEN: optionalInDev(z.string()),
  TWILIO_PHONE_NUMBER: optionalInDev(z.string()),
  ANTHROPIC_API_KEY: optionalInDev(z.string()),
  RESEND_API_KEY: optionalInDev(z.string()),
  RESEND_DEFAULT_FROM: z.string().default('HararAI <notifications@hararai.com>'),
  STRIPE_SECRET_KEY: optionalInDev(z.string()),
  STRIPE_WEBHOOK_SECRET: optionalInDev(z.string()),
  STRIPE_PRICE_STARTER: optionalInDev(z.string()),
  STRIPE_PRICE_PRO: optionalInDev(z.string()),
  GOOGLE_AI_API_KEY: optionalInDev(z.string()),
  GEMINI_LIVE_MODEL: z.string().default('gemini-3.1-flash-live-preview'),
  GEMINI_DEFAULT_VOICE: z.string().default('Kore'),
  GOOGLE_CLIENT_ID: optionalInDev(z.string()),
  GOOGLE_CLIENT_SECRET: optionalInDev(z.string()),
  PLATFORM_ADMIN_EMAILS: z.string().default(''),
  ALLOWED_ORIGINS: z.string().default(''),
  ENABLE_SCHEDULER: z.enum(['true', 'false', '']).default('').transform((v) => v === 'true'),
});

export type Env = z.infer<typeof envSchema>;

function loadConfig(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${missing}`);
  }

  return parsed.data;
}

export const config = loadConfig();
