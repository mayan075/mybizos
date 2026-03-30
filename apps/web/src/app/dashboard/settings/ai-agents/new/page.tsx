'use client';

import { useMemo } from 'react';
import { GuidedSetup } from '@/components/ai-agents/guided-setup';
import { getUser } from '@/lib/auth';
import { getOnboardingData } from '@/lib/onboarding';

export default function NewAgentPage() {
  const businessName = useMemo(() => {
    const user = typeof window !== 'undefined' ? getUser() : null;
    const onboarding = typeof window !== 'undefined' ? getOnboardingData() : null;
    return user?.orgName || onboarding?.businessName || 'My Business';
  }, []);

  return <GuidedSetup businessName={businessName} />;
}
