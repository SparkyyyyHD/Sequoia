import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  SKILL_TIERS,
  buildTechnicalTierSubsection,
  getForumCategory,
  getSubsectionLabel,
} from "@/lib/forum";
import PostList from "@/components/PostList";
import PostForm from "@/components/PostForm";
import FavoriteButton from "@/components/FavoriteButton";
import JoinForumButton from "@/components/JoinForumButton";

const TECHNICAL_ADVICE = getForumCategory("technical-advice");

export default async function ForumFieldPage({
  params,
}: {
  params: Promise<{ field: string }>;
}) {
  const { field } = await params;

  if (!TECHNICAL_ADVICE?.subsections.some((item) => item.slug === field)) {
    notFound();
  }

  const { data: posts } = await supabase
    .from("posts")
    .select(
      "id, content, author_name, created_at, helpful_count, not_helpful_count, category, subcategory"
    )
    .eq("category", "technical-advice")
    .eq("subcategory", field)
    .order("created_at", { ascending: false });

  const label = getSubsectionLabel("technical-advice", field);

  return (
    <>
      <header className="forum-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="forum-kicker">Technical advice</p>
            <h1 className="mt-0.5 text-lg font-semibold text-[var(--forum-text-primary)]">
              {label}
            </h1>
            <p className="mt-1 text-sm text-[var(--forum-text-secondary)]">
              Pick your current skill tier to join focused conversations.
            </p>
          </div>
          <div className="flex items-center gap-1">
            <JoinForumButton category="technical-advice" subsection={field} />
            <FavoriteButton category="technical-advice" subsection={field} />
          </div>
        </div>
      </header>

      <section className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {SKILL_TIERS.map((tier) => (
          <div key={tier.slug} className="forum-subsection-card relative p-3">
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/forum/technical-advice/${field}/${tier.slug}`}
                className="forum-stretched-link text-sm font-medium text-[var(--forum-text-primary)]"
              >
                {tier.label}
              </Link>
              <JoinForumButton
                category="technical-advice"
                subsection={buildTechnicalTierSubsection(field, tier.slug)}
              />
            </div>
            <p className="mt-0.5 text-xs text-[var(--forum-text-secondary)]">
              {tier.description}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-5">
        <header className="forum-card p-3 sm:p-4">
          <h2 className="text-sm font-semibold text-[var(--forum-text-primary)]">
            General threads (all levels)
          </h2>
          <p className="mt-0.5 text-xs text-[var(--forum-text-secondary)]">
            Legacy and mixed-level discussions for {label}.
          </p>
        </header>
        <PostForm category="technical-advice" subcategory={field} />
        <PostList posts={posts ?? []} />
      </section>
    </>
  );
}
