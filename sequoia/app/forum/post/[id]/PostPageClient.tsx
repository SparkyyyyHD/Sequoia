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
import { fetchAuthorSequoiaPoints } from "@/lib/authorPoints";
import SequoiaBadge from "@/components/SequoiaBadge";

interface PostPageClientProps {
  post: Post;
  sectionHref: string | null;
}

export default function PostPageClient({ post, sectionHref }: PostPageClientProps) {
  const [myVotes, setMyVotes] = useState<Record<string, 1 | -1>>({});
  const [commentCount, setCommentCount] = useState<number | null>(null);
  const [authorAvatarUrl, setAuthorAvatarUrl] = useState<string | null>(null);
  const [authorPoints, setAuthorPoints] = useState<number | null>(null);

  useEffect(() => {
    if (!post.author_name) {
      queueMicrotask(() => {
        setAuthorAvatarUrl(null);
        setAuthorPoints(null);
      });
      return;
    }
    let cancelled = false;
    Promise.all([fetchAvatarUrls([post.author_name]), fetchAuthorSequoiaPoints([post.author_name])]).then(
      ([urls, points]) => {
        if (cancelled) return;
        setAuthorAvatarUrl(urls[post.author_name!] ?? null);
        setAuthorPoints(points[post.author_name!] ?? 0);
      }
    );
    return () => {
      cancelled = true;
    };
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
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-semibold text-[var(--forum-text-primary)]">
              {post.author_name?.trim() || "Anonymous"}
            </span>
            {post.author_name && authorPoints !== null ? (
              <SequoiaBadge points={authorPoints} />
            ) : null}
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
