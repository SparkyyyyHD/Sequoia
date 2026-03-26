import Link from "next/link";
import { getForumCategory } from "@/lib/forum";
import { LIFE_SKILL_PILLARS } from "@/lib/skillTrees";
import FavoriteButton from "@/components/FavoriteButton";
import JoinForumButton from "@/components/JoinForumButton";

const LIFE_ADVICE = getForumCategory("life-advice");

export default function ForumLifeAdvicePage() {
  if (!LIFE_ADVICE) return null;

  return (
    <>
      <header className="forum-card p-4 sm:p-5">
        <p className="forum-kicker">Category</p>
        <h1 className="mt-0.5 text-lg font-semibold text-[var(--forum-text-primary)]">
          {LIFE_ADVICE.label}
        </h1>
        <p className="mt-1 text-sm text-[var(--forum-text-secondary)]">
          {LIFE_ADVICE.description}
        </p>
      </header>

      <div className="mt-6 space-y-8">
        {LIFE_SKILL_PILLARS.map((pillar) => (
          <section key={pillar.slug} id={pillar.slug} className="scroll-mt-6">
            <h2 className="text-sm font-semibold text-[var(--forum-text-primary)]">
              {pillar.label}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--forum-text-secondary)]">
              {pillar.description}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {pillar.nodes.map((node) => (
                <div
                  key={node.slug}
                  className="forum-subsection-card relative p-3"
                >
                  <div className="flex items-start justify-between gap-1">
                    <Link
                      href={`/forum/life-advice/${node.slug}`}
                      className="forum-stretched-link text-sm font-medium text-[var(--forum-text-primary)]"
                    >
                      {node.label}
                    </Link>
                    <div className="flex items-center gap-1">
                      <JoinForumButton
                        category="life-advice"
                        subsection={node.slug}
                      />
                      <FavoriteButton category="life-advice" subsection={node.slug} />
                    </div>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--forum-text-secondary)]">
                    {node.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
