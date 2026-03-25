'use client';

import dynamic from 'next/dynamic';

const SkillTreeV3 = dynamic(() => import('@/components/SkillTreeV3'), {
  ssr: false,
});

export default function SkillTreeV3Page() {
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <SkillTreeV3 />
    </div>
  );
}
