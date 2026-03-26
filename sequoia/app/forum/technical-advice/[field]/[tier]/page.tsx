import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  buildTechnicalTierSubsection,
  getForumCategory,
  getSkillTier,
  getSubsectionLabel,
} from "@/lib/forum";
import PostList from "@/components/PostList";
import PostForm from "@/components/PostForm";
import FavoriteButton from "@/components/FavoriteButton";
import JoinForumButton from "@/components/JoinForumButton";

const TECHNICAL_ADVICE = getForumCategory("technical-advice");

export default async function ForumTechnicalTierPage({
  params,
}: {
  params: Promise<{ field: string; tier: string }>;
}) {
  const { field, tier } = await params;

  const fieldExists = TECHNICAL_ADVICE?.subsections.some((item) => item.slug === field);
  const tierMeta = getSkillTier(tier);
  if (!fieldExists || !tierMeta) {
    notFound();
  }

  const subsection = buildTechnicalTierSubsection(field, tierMeta.slug);

  const { data: posts } = await supabase
    .from("posts")
    .select(
      "id, content, author_name, created_at, helpful_count, not_helpful_count, category, subcategory"
    )
    .eq("category", "technical-advice")
    .eq("subcategory", subsection)
    .order("created_at", { ascending: false });

  const fieldLabel = getSubsectionLabel("technical-advice", field);

  return (
    <>
      <header className="forum-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="forum-kicker">Technical advice</p>
            <h1 className="mt-0.5 text-lg font-semibold text-[var(--forum-text-primary)]">
              {fieldLabel} · {tierMeta.label}
            </h1>
            <p className="mt-1 text-sm text-[var(--forum-text-secondary)]">
              {tierMeta.description}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <JoinForumButton category="technical-advice" subsection={subsection} />
            <FavoriteButton category="technical-advice" subsection={subsection} />
          </div>
        </div>
      </header>

      <PostForm category="technical-advice" subcategory={subsection} />
      <PostList posts={posts ?? []} />
    </>
  );
}
