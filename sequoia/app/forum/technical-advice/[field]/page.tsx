import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getForumCategory, getSubsectionLabel } from "@/lib/forum";
import PostList from "@/components/PostList";
import PostForm from "@/components/PostForm";
import FavoriteButton from "@/components/FavoriteButton";

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
          </div>
          <FavoriteButton category="technical-advice" subsection={field} />
        </div>
      </header>

      <PostForm category="technical-advice" subcategory={field} />
      <PostList posts={posts ?? []} />
    </>
  );
}
