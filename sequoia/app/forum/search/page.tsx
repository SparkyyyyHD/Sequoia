import { supabase } from "@/lib/supabase";
import type { Post } from "@/lib/postTypes";
import { POST_LIST_FIELDS } from "@/lib/postSelect";
import PostList from "@/components/PostList";

export default async function ForumSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let posts: Post[] = [];

  if (query.length >= 2) {
    const { data } = await supabase
      .from("posts")
      .select(POST_LIST_FIELDS)
      .or(
        `content.ilike.%${query}%,author_name.ilike.%${query}%,title.ilike.%${query}%,tags_search.ilike.%${query}%`
      )
      .order("created_at", { ascending: false })
      .limit(60);

    posts = (data ?? []) as Post[];
  }

  return (
    <>
      <header className="forum-card p-4 sm:p-5">
        <p className="forum-kicker">Search</p>
        <h1 className="mt-0.5 text-lg font-semibold text-[var(--forum-text-primary)]">
          {query ? `Results for "${query}"` : "Search the forum"}
        </h1>
        {query && (
          <p className="mt-1 text-sm text-[var(--forum-text-secondary)]">
            {posts.length === 0
              ? "No posts found."
              : `${posts.length} post${posts.length === 1 ? "" : "s"} found`}
          </p>
        )}
        {!query && (
          <p className="mt-1 text-sm text-[var(--forum-text-secondary)]">
            Type something in the search bar above to find posts.
          </p>
        )}
      </header>

      {posts.length > 0 && (
        <section className="mt-4">
          <PostList posts={posts} showSubsectionLink />
        </section>
      )}
    </>
  );
}
