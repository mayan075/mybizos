/**
 * Centralized localStorage / cookie key constants.
 * To change the prefix (e.g. during rebrand): change PREFIX only.
 */
const PREFIX = 'hararai';

export const STORAGE_KEYS = {
  token: `${PREFIX}_token`,
  settings: `${PREFIX}_settings`,
  theme: `${PREFIX}_theme`,
  onboarding: `${PREFIX}_onboarding`,
  recentlyViewed: `${PREFIX}_recently_viewed`,
  errorLog: `${PREFIX}_error_log`,
  issues: `${PREFIX}_issues`,
  welcomeDismissed: `${PREFIX}_welcome_dismissed`,
  gettingStartedDismissed: `${PREFIX}_getting_started_dismissed`,
  onboardingSteps: `${PREFIX}_onboarding_steps`,
  adminSettings: `${PREFIX}_admin_settings`,
  adminStatus: `${PREFIX}_admin_status`,
  gettingStartedBannerDismissed: `${PREFIX}_getting_started_banner_dismissed`,
} as const;

/** Cookie name for JWT auth token — must match STORAGE_KEYS.token */
export const AUTH_COOKIE_NAME = STORAGE_KEYS.token;

/** Custom DOM event names */
export const APP_EVENTS = {
  dial: 'app:dial',
} as const;
