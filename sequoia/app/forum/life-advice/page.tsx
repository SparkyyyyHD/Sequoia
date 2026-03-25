import Link from "next/link";
import { getForumCategory } from "@/lib/forum";
import FavoriteButton from "@/components/FavoriteButton";

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

      <section className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {LIFE_ADVICE.subsections.map((subsection) => (
          <div
            key={subsection.slug}
            className="forum-subsection-card relative p-3"
          >
            <div className="flex items-start justify-between gap-1">
              <Link
                href={`/forum/life-advice/${subsection.slug}`}
                className="forum-stretched-link text-sm font-medium text-[var(--forum-text-primary)]"
              >
                {subsection.label}
              </Link>
              <FavoriteButton category="life-advice" subsection={subsection.slug} />
            </div>
            <p className="mt-0.5 text-xs text-[var(--forum-text-secondary)]">
              {subsection.description}
            </p>
          </div>
        ))}
      </section>
    </>
  );
}
