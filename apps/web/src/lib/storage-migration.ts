/**
 * One-time migration from mybizos_* storage keys to hararai_* keys.
 * Safe to call on every page load — no-ops if already migrated.
 * Remove this file after ~4 weeks (May 2026).
 */

const KEY_MAP: Record<string, string> = {
  mybizos_token: 'hararai_token',
  mybizos_settings: 'hararai_settings',
  mybizos_theme: 'hararai_theme',
  mybizos_onboarding: 'hararai_onboarding',
  mybizos_recently_viewed: 'hararai_recently_viewed',
  mybizos_error_log: 'hararai_error_log',
  mybizos_issues: 'hararai_issues',
  mybizos_welcome_dismissed: 'hararai_welcome_dismissed',
  mybizos_getting_started_dismissed: 'hararai_getting_started_dismissed',
  mybizos_onboarding_steps: 'hararai_onboarding_steps',
  mybizos_admin_settings: 'hararai_admin_settings',
  mybizos_admin_status: 'hararai_admin_status',
  mybizos_getting_started_banner_dismissed: 'hararai_getting_started_banner_dismissed',
};

export function migrateStorageKeys(): void {
  if (typeof window === 'undefined') return;

  // Migrate localStorage keys
  for (const [oldKey, newKey] of Object.entries(KEY_MAP)) {
    const value = localStorage.getItem(oldKey);
    if (value !== null && localStorage.getItem(newKey) === null) {
      localStorage.setItem(newKey, value);
      localStorage.removeItem(oldKey);
    }
  }

  // Migrate JWT cookie
  const cookieMatch = document.cookie.match(/(?:^|; )mybizos_token=([^;]*)/);
  if (cookieMatch) {
    const val = decodeURIComponent(cookieMatch[1] ?? '');
    if (val) {
      const maxAge = 7 * 24 * 60 * 60;
      document.cookie = `hararai_token=${val}; path=/; max-age=${maxAge}; SameSite=Lax`;
      document.cookie = 'mybizos_token=; path=/; max-age=0; SameSite=Lax';
    }
  }

  // Migrate PhoneSetupMode enum value inside onboarding data
  const onboarding = localStorage.getItem('hararai_onboarding');
  if (onboarding) {
    try {
      const data = JSON.parse(onboarding);
      if (data?.phoneSetup?.mode === 'mybizos') {
        data.phoneSetup.mode = 'managed';
        localStorage.setItem('hararai_onboarding', JSON.stringify(data));
      }
    } catch {
      // Ignore malformed JSON
    }
  }
}
