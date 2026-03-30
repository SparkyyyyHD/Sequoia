"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MarkdownContent from "@/components/MarkdownContent";
import AuthorAvatar from "@/components/AuthorAvatar";
import PostVoteBar from "@/components/PostVoteBar";
import CommentSection from "@/components/CommentSection";
import PostTitleAndTags from "@/components/PostTitleAndTags";
import type { Post } from "@/lib/postTypes";
import { getDisplayPostBody } from "@/lib/postTags";
import { fetchAvatarUrls } from "@/lib/profiles";

interface PostPageClientProps {
  post: Post;
  sectionHref: string | null;
}

export default function PostPageClient({ post, sectionHref }: PostPageClientProps) {
  const [myVotes, setMyVotes] = useState<Record<string, 1 | -1>>({});
  const [commentCount, setCommentCount] = useState<number | null>(null);
  const [authorAvatarUrl, setAuthorAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!post.author_name) return;
    fetchAvatarUrls([post.author_name]).then((map) => {
      setAuthorAvatarUrl(map[post.author_name!] ?? null);
    });
  }, [post.author_name]);

  function handleMyVoteUpdate(postId: string, vote: 1 | -1 | null) {
    setMyVotes((prev) => {
      const copy = { ...prev };
      if (vote === null) delete copy[postId];
      else copy[postId] = vote;
      return copy;
    });
  }

  return (
    <article className="forum-post-card forum-card mt-4 p-4 sm:p-6">
      <div className="flex gap-3">
        <AuthorAvatar name={post.author_name} src={authorAvatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-semibold text-[var(--forum-text-primary)]">
              {post.author_name?.trim() || "Anonymous"}
            </span>
            <time dateTime={post.created_at} className="text-xs text-[var(--forum-text-muted)]">
              {new Date(post.created_at).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </time>
          </div>

          <PostTitleAndTags post={post} headingLevel={1} className="mt-3" />

          <MarkdownContent
            content={getDisplayPostBody(post)}
            className="mt-4 text-[0.9375rem] leading-relaxed text-[var(--forum-text-primary)]"
          />

          <PostVoteBar
            postId={post.id}
            helpfulCount={post.helpful_count ?? 0}
            notHelpfulCount={post.not_helpful_count ?? 0}
            myVote={myVotes[post.id]}
            onMyVoteUpdate={handleMyVoteUpdate}
          />
        </div>
      </div>

      <div className="mt-6 border-t border-[var(--forum-border)] pt-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--forum-text-primary)]">
          {commentCount === null ? "Comments" : `${commentCount} comment${commentCount === 1 ? "" : "s"}`}
        </h2>
        <CommentSection
          postId={post.id}
          onCountChange={setCommentCount}
        />
      </div>

      {sectionHref && (
        <div className="mt-6 border-t border-[var(--forum-border)] pt-4">
          <Link href={sectionHref} className="forum-link text-xs">
            ← Back to section
          </Link>
        </div>
      )}
    </article>
  );
}
