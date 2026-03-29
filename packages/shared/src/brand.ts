/**
 * Single source of truth for all brand strings.
 * To rebrand: change this file only — all UI, emails, and configs import from here.
 */
export const BRAND = {
  name: 'HararAI',
  domain: 'hararai.com',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://app.hararai.com',
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://api.hararai.com',
  supportEmail: 'support@hararai.com',
  demoEmail: 'demo@hararai.com',
  senderName: 'HararAI',
  senderEmail: process.env.RESEND_DEFAULT_FROM || 'HararAI <notifications@hararai.com>',
  title: (page?: string) => page ? `${page} | HararAI` : 'HararAI — AI-Powered Business OS for Local Services',
  pageTitle: (page: string) => `${page} | HararAI`,
  description: 'AI-Powered Business OS for Local Services',
  copyright: () => `© ${new Date().getFullYear()} HararAI. All rights reserved.`,
  social: {
    twitter: '@hararai',
  },
} as const;
