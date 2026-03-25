import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getForumCategory, getSubsectionLabel } from "@/lib/forum";
import PostList from "@/components/PostList";
import PostForm from "@/components/PostForm";
import FavoriteButton from "@/components/FavoriteButton";

const LIFE_ADVICE = getForumCategory("life-advice");

export default async function ForumAgeGroupPage({
  params,
}: {
  params: Promise<{ ageGroup: string }>;
}) {
  const { ageGroup } = await params;

  if (!LIFE_ADVICE?.subsections.some((group) => group.slug === ageGroup)) {
    notFound();
  }

  const { data: posts } = await supabase
    .from("posts")
    .select(
      "id, content, author_name, created_at, helpful_count, not_helpful_count, category, subcategory"
    )
    .eq("category", "life-advice")
    .eq("subcategory", ageGroup)
    .order("created_at", { ascending: false });

  const label = getSubsectionLabel("life-advice", ageGroup);

  return (
    <>
      <header className="forum-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="forum-kicker">Life advice</p>
            <h1 className="mt-0.5 text-lg font-semibold text-[var(--forum-text-primary)]">
              {label}
            </h1>
          </div>
          <FavoriteButton category="life-advice" subsection={ageGroup} />
        </div>
      </header>

      <PostForm category="life-advice" subcategory={ageGroup} />
      <PostList posts={posts ?? []} />
    </>
  );
}
