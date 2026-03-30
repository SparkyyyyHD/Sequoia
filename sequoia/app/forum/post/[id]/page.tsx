import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getForumSubsectionHref, getSubsectionLabel, type ForumCategorySlug } from "@/lib/forum";
import type { Post } from "@/lib/postTypes";
import { POST_LIST_FIELDS } from "@/lib/postSelect";
import PostPageClient from "./PostPageClient";

export default async function ForumPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data } = await supabase
    .from("posts")
    .select(POST_LIST_FIELDS)
    .eq("id", id)
    .single();

  if (!data) notFound();

  const post = data as Post;
  const cat = post.category as ForumCategorySlug | null;
  const sub = post.subcategory ?? null;
  const sectionLabel = cat && sub ? getSubsectionLabel(cat, sub) : null;
  const sectionHref = cat && sub ? getForumSubsectionHref(cat, sub) : null;

  return (
    <>
      <header className="forum-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--forum-text-muted)]">
          <Link href="/forum" className="forum-link">Forum</Link>
          {sectionHref && sectionLabel && (
            <>
              <span aria-hidden>·</span>
              <Link href={sectionHref} className="forum-link">{sectionLabel}</Link>
            </>
          )}
          <span aria-hidden>·</span>
          <span>Post</span>
        </div>
        {sectionLabel && (
          <p className="mt-2">
            <span className="forum-post-topic-tag">{sectionLabel}</span>
          </p>
        )}
      </header>

      <PostPageClient post={post} sectionHref={sectionHref} />
    </>
  );
}
