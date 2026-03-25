"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getOrCreateVoterKey } from "@/lib/voterKey";
import { fetchComments, type Comment } from "@/lib/comments";
import { useAuth } from "@/components/AuthProvider";

export default function CommentSection({ postId }: { postId: string }) {
  const { user, displayName, isGuest } = useAuth();
  const canComment = !!user || isGuest;
  const [comments, setComments] = useState<Comment[]>([]);
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function load() {
    setLoading(true);
    const data = await fetchComments(postId);
    setComments(data);
    const counts: Record<string, number> = {};
    for (const c of data) counts[c.id] = c.like_count;
    setLikeCounts(counts);

    const voterKey = getOrCreateVoterKey();
    if (voterKey && data.length > 0) {
      const { data: liked } = await supabase.rpc("get_my_liked_comments", {
        p_voter_key: voterKey,
        p_comment_ids: data.map((c) => c.id),
      });
      if (liked) {
        setMyLikes(
          new Set((liked as { comment_id: string }[]).map((r) => r.comment_id))
        );
      }
    }
    setLoading(false);
  }

  async function toggleLike(commentId: string) {
    const voterKey = getOrCreateVoterKey();
    if (!voterKey) return;
    const wasLiked = myLikes.has(commentId);
    setMyLikes((prev) => {
      const next = new Set(prev);
      wasLiked ? next.delete(commentId) : next.add(commentId);
      return next;
    });
    setLikeCounts((prev) => ({
      ...prev,
      [commentId]: (prev[commentId] ?? 0) + (wasLiked ? -1 : 1),
    }));
    await supabase.rpc("toggle_comment_like", {
      p_comment_id: commentId,
      p_voter_key: voterKey,
    });
  }

  async function submitComment(
    content: string,
    parentId: string | null
  ): Promise<string | null> {
    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      parent_id: parentId,
      content: content.trim(),
      author_name: displayName,
    });
    if (error) return error.message;
    await load();
    setReplyingTo(null);
    return null;
  }

  const topLevel = comments.filter((c) => !c.parent_id);
  const replies = comments.reduce<Record<string, Comment[]>>((acc, c) => {
    if (c.parent_id) {
      acc[c.parent_id] = [...(acc[c.parent_id] ?? []), c];
    }
    return acc;
  }, {});

  if (loading) {
    return <p className="text-xs text-[var(--forum-text-muted)]">Loading comments...</p>;
  }

  return (
    <div className="comment-section">
      {topLevel.length === 0 && (
        <p className="text-xs text-[var(--forum-text-muted)]">No comments yet.</p>
      )}

      {topLevel.map((comment) => (
        <div key={comment.id}>
          <CommentItem
            comment={comment}
            liked={myLikes.has(comment.id)}
            likeCount={likeCounts[comment.id] ?? 0}
            onLike={() => toggleLike(comment.id)}
            onReply={
              canComment
                ? () => setReplyingTo(replyingTo === comment.id ? null : comment.id)
                : undefined
            }
            replyActive={replyingTo === comment.id}
          />

          {(replies[comment.id] ?? []).length > 0 && (
            <div className="comment-replies">
              {replies[comment.id].map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  liked={myLikes.has(reply.id)}
                  likeCount={likeCounts[reply.id] ?? 0}
                  onLike={() => toggleLike(reply.id)}
                />
              ))}
            </div>
          )}

          {replyingTo === comment.id && canComment && (
            <div className="comment-reply-form">
              <InlineCommentForm
                placeholder={`Reply to ${comment.author_name ?? "Anonymous"}...`}
                onSubmit={(c) => submitComment(c, comment.id)}
                onCancel={() => setReplyingTo(null)}
                displayName={displayName}
              />
            </div>
          )}
        </div>
      ))}

      <div className="comment-add-form">
        {canComment ? (
          <InlineCommentForm
            placeholder="Add a comment..."
            onSubmit={(c) => submitComment(c, null)}
            displayName={displayName}
          />
        ) : (
          <p className="text-xs text-[var(--forum-text-muted)]">
            <Link href="/login" className="forum-link font-semibold">
              Sign in
            </Link>{" "}
            or{" "}
            <Link href="/login" className="forum-link font-semibold">
              play as guest
            </Link>{" "}
            to leave a comment.
          </p>
        )}
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  liked,
  likeCount,
  onLike,
  onReply,
  replyActive,
}: {
  comment: Comment;
  liked: boolean;
  likeCount: number;
  onLike: () => void;
  onReply?: () => void;
  replyActive?: boolean;
}) {
  return (
    <div className="comment-item">
      <div className="comment-meta">
        <span>{comment.author_name ?? "Anonymous"}</span>
        <span className="comment-meta-sep">·</span>
        <span>
          {new Date(comment.created_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
      <p className="comment-content">{comment.content}</p>
      <div className="comment-actions">
        <button
          type="button"
          onClick={onLike}
          className={`comment-like-btn${liked ? " comment-like-btn--active" : ""}`}
        >
          ♥{likeCount > 0 ? ` ${likeCount}` : ""}
        </button>
        {onReply && (
          <button type="button" onClick={onReply} className="comment-text-btn">
            {replyActive ? "Cancel" : "Reply"}
          </button>
        )}
      </div>
    </div>
  );
}

function InlineCommentForm({
  placeholder,
  onSubmit,
  onCancel,
  displayName,
}: {
  placeholder: string;
  onSubmit: (content: string) => Promise<string | null>;
  onCancel?: () => void;
  displayName: string | null;
}) {
  const [content, setContent] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setPending(true);
    const err = await onSubmit(content);
    setPending(false);
    if (err) { setError(err); return; }
    setContent("");
    setError(null);
  }

  return (
    <form onSubmit={handleSubmit} className="comment-form">
      {displayName && (
        <p className="text-xs text-[var(--forum-text-muted)] mb-1">
          Commenting as{" "}
          <span className="font-medium text-[var(--forum-text-secondary)]">
            {displayName}
          </span>
        </p>
      )}
      <div className="comment-form-inputs">
        <textarea
          placeholder={placeholder}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          required
          className="forum-input comment-form-body"
        />
      </div>
      {error && <p className="text-xs text-[var(--forum-error)]">{error}</p>}
      <div className="comment-form-actions">
        <button
          type="submit"
          disabled={pending || !content.trim()}
          className="forum-button disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? "Posting..." : "Post"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="comment-text-btn">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
