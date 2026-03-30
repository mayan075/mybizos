'use client';

import { GuidedSetup } from '@/components/ai-agents/guided-setup';

export default function NewAgentPage() {
  const businessName = 'Northern Removals'; // TODO: get from org settings
  return <GuidedSetup businessName={businessName} />;
}
