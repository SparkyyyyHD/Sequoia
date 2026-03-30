'use client';

import dynamic from 'next/dynamic';
import ForumSidebar from '@/components/ForumSidebar';

const SkillTree = dynamic(() => import('@/components/SkillTree'), {
  ssr: false,
});

export default function SkillTreePage() {
  return (
    <main className="forum-page forum-with-sidebar">
      <ForumSidebar />
      <div className="forum-main" style={{ minHeight: '100dvh' }}>
        <SkillTree />
      </div>
    </main>
  );
}
