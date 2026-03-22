import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  APP_URL: z.string().default('http://localhost:3001'),
  TWILIO_ACCOUNT_SID: z.string().min(1),
  TWILIO_AUTH_TOKEN: z.string().min(1),
  TWILIO_PHONE_NUMBER: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  POSTMARK_SERVER_TOKEN: z.string().min(1),
  POSTMARK_DEFAULT_FROM: z.string().default('noreply@mybizos.com'),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  VAPI_API_KEY: z.string().min(1),
  VAPI_WEBHOOK_SECRET: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

function loadConfig(): Env {
  // In development, merge dev defaults BEFORE validation
  const isDev = !process.env['NODE_ENV'] || process.env['NODE_ENV'] === 'development';
  // Filter out empty/undefined env vars so dev defaults aren't overridden
  const cleanEnv = Object.fromEntries(
    Object.entries(process.env).filter(([, v]) => v !== undefined && v !== '')
  );
  const envToValidate = isDev
    ? { ...getDevDefaults(), ...cleanEnv }
    : process.env;

  const parsed = envSchema.safeParse(envToValidate);

  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${missing}`);
  }

  return parsed.data;
}

function getDevDefaults(): Record<string, string> {
  return {
    DATABASE_URL: 'postgresql://localhost:5432/mybizos_dev',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'dev-jwt-secret-change-in-production-must-be-32-chars',
    TWILIO_ACCOUNT_SID: 'AC_dev_placeholder',
    TWILIO_AUTH_TOKEN: 'dev_auth_token_placeholder',
    TWILIO_PHONE_NUMBER: '+15555555555',
    ANTHROPIC_API_KEY: 'sk-ant-dev-placeholder',
    POSTMARK_SERVER_TOKEN: 'dev-postmark-token',
    STRIPE_SECRET_KEY: 'sk_test_dev_placeholder',
    STRIPE_WEBHOOK_SECRET: 'whsec_dev_placeholder',
    VAPI_API_KEY: 'dev-vapi-key',
    VAPI_WEBHOOK_SECRET: 'dev-vapi-webhook-secret',
    APP_URL: 'http://localhost:3001',
    POSTMARK_DEFAULT_FROM: 'noreply@mybizos.com',
  };
}

export const config = loadConfig();
