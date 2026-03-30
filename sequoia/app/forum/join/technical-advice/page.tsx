import Link from "next/link";
import { getForumCategory, getForumSubsectionHref } from "@/lib/forum";
import { TECHNICAL_SKILL_TREES, type TechnicalFieldSlug } from "@/lib/skillTrees";
import { getTechnicalFieldMark } from "@/lib/sectionJoinBranding";
import { loadForumSectionActivity } from "@/lib/sectionJoinStats";
import JoinSectionCard from "@/components/JoinSectionCard";

const TECHNICAL_ADVICE = getForumCategory("technical-advice");

export default async function JoinTechnicalAdvicePage() {
  const { technicalByField } = await loadForumSectionActivity();

  return (
    <>
      <header className="forum-card p-4 sm:p-5">
        <p className="forum-kicker">Forum · Technical advice</p>
        <h1 className="mt-0.5 text-lg font-semibold text-[var(--forum-text-primary)]">
          Join technical sections
        </h1>
        <p className="mt-1 text-sm text-[var(--forum-text-secondary)]">
          One join per field unlocks the whole tree for that topic—field hub, skill threads, and shared feed.
          Stats count all posts in that field (hub + skills). Voices = distinct author display names.
        </p>
        <p className="mt-2 text-xs text-[var(--forum-text-muted)]">
          <Link href="/forum/join/life-advice" className="forum-link">
            Looking for life advice sections?
          </Link>{" "}
          ·{" "}
          <Link href="/forum/technical-advice" className="forum-link">
            Browse technical overview
          </Link>
        </p>
      </header>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(TECHNICAL_ADVICE?.subsections ?? []).map((field) => {
          const stats = technicalByField[field.slug];
          const mark = getTechnicalFieldMark(field.slug);
          const tree = TECHNICAL_SKILL_TREES[field.slug as TechnicalFieldSlug];
          const skillCount = tree?.length ?? 0;
          return (
            <JoinSectionCard
              key={field.slug}
              category="technical-advice"
              subsection={field.slug}
              label={field.label}
              description={field.description}
              sectionHref={getForumSubsectionHref("technical-advice", field.slug)}
              postCount={stats?.postCount ?? 0}
              contributorCount={stats?.contributorCount ?? 0}
              topicCount={skillCount}
              topicLabel={skillCount === 1 ? "skill node" : "skill nodes"}
              emoji={mark.emoji}
              accentHue={mark.hue}
            />
          );
        })}
      </div>
    </>
  );
}
