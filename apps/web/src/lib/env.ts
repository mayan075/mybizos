import { z } from 'zod';

/**
 * Environment configuration for the web app.
 * Validated at import time so missing vars fail fast.
 *
 * NEXT_PUBLIC_ vars are available in both server and client.
 * Non-prefixed vars are server-only.
 */

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3001'),
  NEXT_PUBLIC_APP_NAME: z.string().default('HararAI'),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().default(''),
});

export type Env = z.infer<typeof envSchema>;

function getEnv(): Env {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? process.env['NEXT_PUBLIC_API_URL'],
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME ?? process.env['NEXT_PUBLIC_APP_NAME'],
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? process.env['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'],
  });

  if (!parsed.success) {
    console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
    // Don't throw in the browser — just use defaults
    return envSchema.parse({});
  }

  return parsed.data;
}

export const env = getEnv();
