import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getLifeSkillNode } from "@/lib/skillTrees";
import PostList from "@/components/PostList";
import PostForm from "@/components/PostForm";
import FavoriteButton from "@/components/FavoriteButton";
import JoinForumButton from "@/components/JoinForumButton";

export default async function ForumLifeSkillPage({
  params,
}: {
  params: Promise<{ skill: string }>;
}) {
  const { skill } = await params;
  const meta = getLifeSkillNode(skill);
  if (!meta) {
    notFound();
  }

  const { data: posts } = await supabase
    .from("posts")
    .select(
      "id, content, author_name, created_at, helpful_count, not_helpful_count, category, subcategory"
    )
    .eq("category", "life-advice")
    .eq("subcategory", skill)
    .order("created_at", { ascending: false });

  return (
    <>
      <header className="forum-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="forum-kicker">Life advice</p>
            <h1 className="mt-0.5 text-lg font-semibold text-[var(--forum-text-primary)]">
              {meta.label}
            </h1>
            <p className="mt-1 text-sm text-[var(--forum-text-secondary)]">
              {meta.description}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <JoinForumButton category="life-advice" subsection={skill} />
            <FavoriteButton category="life-advice" subsection={skill} />
          </div>
        </div>
      </header>

      <PostForm category="life-advice" subcategory={skill} />
      <PostList posts={posts ?? []} />
    </>
  );
}
