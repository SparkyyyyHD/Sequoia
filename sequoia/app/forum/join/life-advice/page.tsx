import Link from "next/link";
import { getForumSubsectionHref } from "@/lib/forum";
import { LIFE_SKILL_PILLARS } from "@/lib/skillTrees";
import { getLifeSectionMark } from "@/lib/sectionJoinBranding";
import { loadForumSectionActivity } from "@/lib/sectionJoinStats";
import JoinSectionCard from "@/components/JoinSectionCard";

export default async function JoinLifeAdvicePage() {
  const { lifeByPillar } = await loadForumSectionActivity();

  return (
    <>
      <header className="forum-card p-4 sm:p-5">
        <p className="forum-kicker">Forum · Life advice</p>
        <h1 className="mt-0.5 text-lg font-semibold text-[var(--forum-text-primary)]">
          Join life advice sections
        </h1>
        <p className="mt-1 text-sm text-[var(--forum-text-secondary)]">
          Each section covers a full skill arc. Add it to your sidebar, home feed, and skill tree. Stats reflect
          public posts in this app (unique voices = distinct display names).
        </p>
        <p className="mt-2 text-xs text-[var(--forum-text-muted)]">
          <Link href="/forum/join/technical-advice" className="forum-link">
            Looking for technical fields?
          </Link>{" "}
          ·{" "}
          <Link href="/forum/life-advice" className="forum-link">
            Browse life advice overview
          </Link>
        </p>
      </header>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {LIFE_SKILL_PILLARS.map((pillar) => {
          const stats = lifeByPillar[pillar.slug];
          const mark = getLifeSectionMark(pillar.slug);
          return (
            <JoinSectionCard
              key={pillar.slug}
              category="life-advice"
              subsection={pillar.slug}
              label={pillar.label}
              description={pillar.description}
              sectionHref={getForumSubsectionHref("life-advice", pillar.slug)}
              postCount={stats?.postCount ?? 0}
              contributorCount={stats?.contributorCount ?? 0}
              topicCount={pillar.nodes.length}
              topicLabel={pillar.nodes.length === 1 ? "skill topic" : "skill topics"}
              emoji={mark.emoji}
              accentHue={mark.hue}
            />
          );
        })}
      </div>
    </>
  );
}
