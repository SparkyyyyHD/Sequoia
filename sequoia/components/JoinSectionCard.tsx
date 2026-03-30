"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import JoinForumButton from "@/components/JoinForumButton";
import type { ForumCategorySlug } from "@/lib/forum";

interface JoinSectionCardProps {
  category: ForumCategorySlug;
  subsection: string;
  label: string;
  description: string;
  sectionHref: string;
  postCount: number;
  contributorCount: number;
  topicCount: number;
  topicLabel: string;
  emoji: string;
  accentHue: number;
}

export default function JoinSectionCard({
  category,
  subsection,
  label,
  description,
  sectionHref,
  postCount,
  contributorCount,
  topicCount,
  topicLabel,
  emoji,
  accentHue,
}: JoinSectionCardProps) {
  const postsLabel =
    postCount === 0 ? "No posts yet" : `${postCount.toLocaleString()} post${postCount === 1 ? "" : "s"}`;
  const voicesLabel =
    contributorCount === 0
      ? "No contributors yet"
      : `${contributorCount.toLocaleString()} voice${contributorCount === 1 ? "" : "s"}`;

  return (
    <article
      className="forum-join-section-card forum-subsection-card relative flex flex-col gap-3 p-4 sm:p-4"
      style={
        {
          "--join-accent": `${accentHue} 65% 42%`,
          "--join-accent-soft": `${accentHue} 45% 94%`,
        } as CSSProperties
      }
    >
      <div className="flex gap-3">
        <div
          className="forum-join-section-card__mark flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-2xl shadow-sm"
          aria-hidden
        >
          {emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="text-sm font-semibold text-[var(--forum-text-primary)]">{label}</h2>
            <JoinForumButton category={category} subsection={subsection} />
          </div>
          <dl className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--forum-text-secondary)]">
            <div className="flex gap-1">
              <dt className="sr-only">Posts</dt>
              <dd>{postsLabel}</dd>
            </div>
            <span className="text-[var(--forum-text-muted)]" aria-hidden>
              ·
            </span>
            <div className="flex gap-1">
              <dt className="sr-only">Contributors</dt>
              <dd>{voicesLabel}</dd>
            </div>
            <span className="text-[var(--forum-text-muted)]" aria-hidden>
              ·
            </span>
            <div className="flex gap-1">
              <dt className="sr-only">{topicLabel}</dt>
              <dd>
                {topicCount.toLocaleString()} {topicLabel}
              </dd>
            </div>
          </dl>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-[var(--forum-text-secondary)]">{description}</p>
      <Link href={sectionHref} className="forum-link text-xs font-medium">
        Open section →
      </Link>
    </article>
  );
}
