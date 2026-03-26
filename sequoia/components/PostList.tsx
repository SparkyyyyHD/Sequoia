"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getOrCreateVoterKey } from "@/lib/voterKey";
import {
  getForumSubsectionHref,
  getSubsectionLabel,
  type ForumCategorySlug,
} from "@/lib/forum";
import type { Post } from "@/lib/postTypes";
import PostVoteBar from "@/components/PostVoteBar";
import CommentSection from "@/components/CommentSection";
import ShareButton from "@/components/ShareButton";
import MarkdownContent from "@/components/MarkdownContent";

interface PostListProps {
  posts: Post[];
  showSubsectionLink?: boolean;
}

export default function PostList({ posts, showSubsectionLink }: PostListProps) {
  const [myVotes, setMyVotes] = useState<Record<string, 1 | -1>>({});
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const idsKey = useMemo(() => posts.map((p) => p.id).sort().join(","), [posts]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const key = getOrCreateVoterKey();
      if (!key || posts.length === 0) return;
      const ids = posts.map((p) => p.id);
      const { data } = await supabase.rpc("get_my_votes_for_posts", {
        p_voter_key: key,
        p_post_ids: ids,
      });
      if (cancelled || !data) return;
      const next: Record<string, 1 | -1> = {};
      for (const row of data as { post_id: string; vote: number }[]) {
        next[row.post_id] = row.vote as 1 | -1;
      }
      setMyVotes(next);
    }
    load();
    return () => { cancelled = true; };
  }, [idsKey, posts.length]);

  useEffect(() => {
    let cancelled = false;

    async function loadCommentCounts() {
      if (posts.length === 0) {
        setCommentCounts({});
        return;
      }

      const ids = posts.map((p) => p.id);
      const { data } = await supabase
        .from("comments")
        .select("post_id")
        .in("post_id", ids);

      if (cancelled) return;

      const next = ids.reduce<Record<string, number>>((acc, id) => {
        acc[id] = 0;
        return acc;
      }, {});

      for (const row of (data ?? []) as { post_id: string }[]) {
        next[row.post_id] = (next[row.post_id] ?? 0) + 1;
      }

      setCommentCounts(next);
    }

    loadCommentCounts();
    return () => { cancelled = true; };
  }, [idsKey, posts]);

  function handleMyVoteUpdate(postId: string, vote: 1 | -1 | null) {
    setMyVotes((prev) => {
      const copy = { ...prev };
      if (vote === null) delete copy[postId];
      else copy[postId] = vote;
      return copy;
    });
  }

  function toggleComments(postId: string) {
    setOpenComments((prev) => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  }

  if (posts.length === 0) {
    return (
      <p className="mt-3 text-sm text-[var(--forum-text-muted)]">No posts to show.</p>
    );
  }

  return (
    <ul className="mt-2 space-y-2">
      {posts.map((post) => {
        const cat = post.category;
        const sub = post.subcategory;
        const subsectionLabel =
          cat && sub ? getSubsectionLabel(cat as ForumCategorySlug, sub) : null;
        const subsectionHref =
          cat && sub ? getForumSubsectionHref(cat as ForumCategorySlug, sub) : null;
        const commentsOpen = openComments.has(post.id);

        return (
          <li key={post.id} id={`post-${post.id}`} className="forum-card p-3 sm:p-4">
            {showSubsectionLink && subsectionHref && subsectionLabel && (
              <p className="mb-1.5 text-xs text-[var(--forum-text-muted)]">
                <Link href={subsectionHref} className="forum-link">
                  {cat === "life-advice" ? "Life advice" : "Technical advice"} &middot; {subsectionLabel}
                </Link>
              </p>
            )}
            <MarkdownContent
              content={post.content}
              className="text-sm leading-relaxed text-[var(--forum-text-primary)]"
            />
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--forum-text-muted)]">
              <span>{post.author_name ?? "Anonymous"}</span>
              <span>
                {new Date(post.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <PostVoteBar
              postId={post.id}
              helpfulCount={post.helpful_count ?? 0}
              notHelpfulCount={post.not_helpful_count ?? 0}
              myVote={myVotes[post.id]}
              onMyVoteUpdate={handleMyVoteUpdate}
            />
            <div className="post-actions">
              <button
                type="button"
                onClick={() => toggleComments(post.id)}
                className={`post-action-btn${commentsOpen ? " post-action-btn--active" : ""}`}
              >
                Comments ({commentCounts[post.id] ?? 0})
              </button>
              <ShareButton postId={post.id} />
            </div>
            {commentsOpen && (
              <div className="mt-3 border-t border-[var(--forum-border)] pt-3">
                <CommentSection
                  postId={post.id}
                  onCountChange={(count) =>
                    setCommentCounts((prev) => ({ ...prev, [post.id]: count }))
                  }
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
