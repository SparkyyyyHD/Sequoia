'use client';

import dynamic from 'next/dynamic';

const SkillTreeV2 = dynamic(() => import('@/components/SkillTreeV2'), {
  ssr: false,
});

export default function SkillTreeV2Page() {
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <SkillTreeV2 />
    </div>
  );
}
