"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getOrCreateVoterKey } from "@/lib/voterKey";
import { fetchComments, type Comment } from "@/lib/comments";
import { useAuth } from "@/components/AuthProvider";
import MarkdownContent from "@/components/MarkdownContent";
import { buildAttachmentMarkdown, uploadAttachments } from "@/lib/attachments";
import {
  convertContentForSubmit,
} from "@/lib/markdown";

export default function CommentSection({
  postId,
  onCountChange,
}: {
  postId: string;
  onCountChange?: (count: number) => void;
}) {
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
    onCountChange?.(data.length);
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

  // Build a map of parent_id -> children
  const childrenMap = comments.reduce<Record<string, Comment[]>>((acc, c) => {
    if (c.parent_id) {
      acc[c.parent_id] = [...(acc[c.parent_id] ?? []), c];
    }
    return acc;
  }, {});

  function renderComments(parentId: string | null, depth = 0) {
    const items = comments.filter((c) => c.parent_id === parentId);
    if (items.length === 0) return null;
    return (
      <div className={parentId ? "comment-replies" : undefined}>
        {items.map((comment) => (
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
            {renderComments(comment.id, depth + 1)}
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
      </div>
    );
  }

  if (loading) {
    return <p className="text-xs text-[var(--forum-text-muted)]">Loading comments...</p>;
  }

  return (
    <div className="comment-section">
      {comments.filter((c) => !c.parent_id).length === 0 && (
        <p className="text-xs text-[var(--forum-text-muted)]">No comments yet.</p>
      )}
      {renderComments(null)}
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
              post as a guest
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
      <MarkdownContent content={comment.content} className="comment-content" />
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
  const [attachments, setAttachments] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const previewContent = convertContentForSubmit(content);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!previewContent && attachments.length === 0) return;

    let attachmentMarkdown = "";
    if (attachments.length > 0) {
      setUploadingAttachments(true);
      try {
        const urls = await uploadAttachments(attachments, "comments");
        attachmentMarkdown = urls
          .map((url, idx) => buildAttachmentMarkdown(url, attachments[idx].name))
          .join("\n");
      } catch (uploadError) {
        const message =
          uploadError instanceof Error
            ? uploadError.message
            : "Could not upload attachments.";
        setError(message);
        setUploadingAttachments(false);
        return;
      }
      setUploadingAttachments(false);
    }

    const finalContent = [previewContent, attachmentMarkdown]
      .filter(Boolean)
      .join("\n\n")
      .trim();

    setPending(true);
    const err = await onSubmit(finalContent);
    setPending(false);
    if (err) { setError(err); return; }
    setContent("");
    setAttachments([]);
    setFileInputKey((k) => k + 1);
    setError(null);
  }

  function handleAttachmentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;
    setAttachments((prev) => [...prev, ...selected]);
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
          className="forum-input comment-form-body"
        />
      </div>
      <div className="mt-1">
        <input
          id={`comment-attachments-${fileInputKey}`}
          key={fileInputKey}
          type="file"
          multiple
          onChange={handleAttachmentChange}
          className="hidden"
        />
        <label
          htmlFor={`comment-attachments-${fileInputKey}`}
          className="inline-flex cursor-pointer items-center gap-2 rounded border border-[var(--forum-border)] bg-[var(--forum-bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--forum-text-secondary)] hover:bg-[var(--forum-hover)]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21.44 11.05l-8.49 8.49a5.5 5.5 0 0 1-7.78-7.78l9.19-9.19a3.5 3.5 0 1 1 4.95 4.95l-9.2 9.19a1.5 1.5 0 0 1-2.12-2.12l8.48-8.48" />
          </svg>
          Attach files
        </label>
      </div>
      {attachments.length > 0 && (
        <p className="text-xs text-[var(--forum-text-muted)]">
          {attachments.length} file attachment{attachments.length === 1 ? "" : "s"} selected.
        </p>
      )}
      {previewContent && (
        <div className="rounded border border-[var(--forum-border)] bg-[var(--forum-bg-secondary)] p-2">
          <p className="mb-1 text-xs font-medium text-[var(--forum-text-muted)]">Preview</p>
          <MarkdownContent content={previewContent} className="comment-content" />
        </div>
      )}
      {error && <p className="text-xs text-[var(--forum-error)]">{error}</p>}
      <div className="comment-form-actions">
        <button
          type="submit"
          disabled={pending || uploadingAttachments || (!previewContent && attachments.length === 0)}
          className="forum-button disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploadingAttachments ? "Uploading files..." : pending ? "Posting..." : "Post"}
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
