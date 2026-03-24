import { z } from 'zod';

/**
 * In production, all keys are required. In development, all keys default to
 * empty/placeholder values so the server boots with ZERO env vars set.
 */
const isDev = !process.env['NODE_ENV'] || process.env['NODE_ENV'] === 'development';

const optionalInDev = (schema: z.ZodString) =>
  isDev ? schema.default('') : schema.min(1);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
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
  RESEND_DEFAULT_FROM: z.string().default('MyBizOS <notifications@resend.dev>'),
  STRIPE_SECRET_KEY: optionalInDev(z.string()),
  STRIPE_WEBHOOK_SECRET: optionalInDev(z.string()),
  VAPI_API_KEY: optionalInDev(z.string()),
  VAPI_WEBHOOK_SECRET: optionalInDev(z.string()),
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
