import Link from "next/link";
import { getForumCategory } from "@/lib/forum";
import { LIFE_SKILL_PILLARS } from "@/lib/skillTrees";
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
            <div className="forum-subsection-card relative p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--forum-text-primary)]">
                    <Link
                      href={`/forum/life-advice/${pillar.slug}`}
                      className="forum-stretched-link"
                    >
                      {pillar.label}
                    </Link>
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--forum-text-secondary)]">
                    {pillar.description}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <JoinForumButton category="life-advice" subsection={pillar.slug} />
                </div>
              </div>
              <p className="mt-3 text-xs text-[var(--forum-text-muted)]">
                {pillar.nodes.length} skills in this section:{" "}
                {pillar.nodes.slice(0, 3).map((node) => node.label).join(", ")}
                {pillar.nodes.length > 3 ? ", ..." : ""}
              </p>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
