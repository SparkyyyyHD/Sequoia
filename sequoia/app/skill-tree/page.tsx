'use client';

import dynamic from 'next/dynamic';

const SkillTreeScene = dynamic(() => import('@/components/SkillTreeScene'), {
  ssr: false,
});

export default function SkillTreePage() {
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <SkillTreeScene />
    </div>
  );
}
