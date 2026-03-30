"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getOrCreateVoterKey } from "@/lib/voterKey";
import { getSubsectionLabel, type ForumCategorySlug } from "@/lib/forum";
import type { Post } from "@/lib/postTypes";
import PostVoteBar from "@/components/PostVoteBar";
import CommentSection from "@/components/CommentSection";
import ShareButton from "@/components/ShareButton";
import MarkdownContent from "@/components/MarkdownContent";
import AuthorAvatar from "@/components/AuthorAvatar";
import PostTitleAndTags from "@/components/PostTitleAndTags";
import { getDisplayPostBody } from "@/lib/postTags";
import { fetchAvatarUrls } from "@/lib/profiles";

interface PostListProps {
  posts: Post[];
  showSubsectionLink?: boolean;
}

export default function PostList({ posts, showSubsectionLink }: PostListProps) {
  const [myVotes, setMyVotes] = useState<Record<string, 1 | -1>>({});
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});
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

  useEffect(() => {
    const names = posts.map((p) => p.author_name).filter(Boolean) as string[];
    if (names.length === 0) return;
    fetchAvatarUrls(names).then(setAvatarUrls);
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
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }

  if (posts.length === 0) {
    return (
      <p className="mt-3 text-sm text-[var(--forum-text-muted)]">No posts to show.</p>
    );
  }

  return (
    <ul className="mt-3 space-y-3">
      {posts.map((post) => {
        const cat = post.category;
        const sub = post.subcategory;
        const subsectionLabel =
          cat && sub ? getSubsectionLabel(cat as ForumCategorySlug, sub) : null;
        const commentsOpen = openComments.has(post.id);

        return (
          <li key={post.id} id={`post-${post.id}`} className="forum-post-card forum-card p-4 sm:p-5">
            <div className="flex gap-3">
              <AuthorAvatar
                name={post.author_name}
                src={post.author_name ? avatarUrls[post.author_name] : undefined}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-sm font-semibold text-[var(--forum-text-primary)]">
                    {post.author_name?.trim() || "Anonymous"}
                  </span>
                  <time
                    dateTime={post.created_at}
                    className="text-xs text-[var(--forum-text-muted)]"
                  >
                    {new Date(post.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                  <Link
                    href={`/forum/post/${post.id}`}
                    className="ml-auto text-xs text-[var(--forum-text-muted)] hover:text-[var(--forum-accent)] hover:underline"
                  >
                    View thread
                  </Link>
                </div>
                {showSubsectionLink && subsectionLabel && (
                  <p className="mt-1.5">
                    <span className="forum-post-topic-tag" title="Topic tag for this post">
                      {subsectionLabel}
                    </span>
                  </p>
                )}
                <PostTitleAndTags post={post} headingLevel={2} className="mt-2" />
                <MarkdownContent
                  content={getDisplayPostBody(post)}
                  className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--forum-text-primary)]"
                />
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
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
