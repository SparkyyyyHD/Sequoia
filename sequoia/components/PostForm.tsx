"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import MarkdownContent from "@/components/MarkdownContent";
import { buildAttachmentMarkdown, uploadAttachments } from "@/lib/attachments";
import {
  convertContentForSubmit,
} from "@/lib/markdown";

interface PostFormProps {
  category: string;
  subcategory: string;
}

export default function PostForm({ category, subcategory }: PostFormProps) {
  const router = useRouter();
  const { user, displayName, loading, isGuest } = useAuth();
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const previewContent = convertContentForSubmit(content);

  if (loading) return null;

  if (!user && !isGuest) {
    return (
      <div className="forum-card mt-4 p-4 text-sm text-[var(--forum-text-secondary)]">
        <Link href="/login" className="forum-link font-semibold">
          Sign in
        </Link>{" "}
        or{" "}
        <Link href="/login" className="forum-link font-semibold">
          post as a guest
        </Link>{" "}
        to leave a post.
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const finalContent = convertContentForSubmit(content);
    if (!finalContent && attachments.length === 0) return;

    let attachmentMarkdown = "";
    if (attachments.length > 0) {
      setIsUploadingAttachments(true);
      try {
        const urls = await uploadAttachments(attachments, "posts");
        attachmentMarkdown = urls
          .map((url, idx) => buildAttachmentMarkdown(url, attachments[idx].name))
          .join("\n");
      } catch (uploadError) {
        const message =
          uploadError instanceof Error
            ? uploadError.message
            : "Could not upload attachments.";
        setError(message);
        setIsUploadingAttachments(false);
        return;
      }
      setIsUploadingAttachments(false);
    }

    const combinedContent = [finalContent, attachmentMarkdown]
      .filter(Boolean)
      .join("\n\n")
      .trim();

    const { error: insertError } = await supabase.from("posts").insert({
      category,
      subcategory,
      content: combinedContent,
      author_name: displayName,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setContent("");
    setAttachments([]);
    setFileInputKey((k) => k + 1);
    startTransition(() => {
      router.refresh();
    });
  }

  function handleAttachmentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;
    setAttachments((prev) => [...prev, ...selected]);
  }

  return (
    <form onSubmit={handleSubmit} className="forum-card mt-4 p-4">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-[var(--forum-text-muted)]">
          Posting as{" "}
          <span className="font-medium text-[var(--forum-text-secondary)]">
            {displayName}
          </span>
        </span>
      </div>
      <textarea
        id="post-body"
        placeholder="Write your post..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="forum-input min-h-[4.5rem] resize-y"
      />
      <div className="mt-2 flex items-center gap-2">
        <input
          id={`post-attachments-${fileInputKey}`}
          key={fileInputKey}
          type="file"
          multiple
          onChange={handleAttachmentChange}
          className="hidden"
        />
        <label
          htmlFor={`post-attachments-${fileInputKey}`}
          className="inline-flex cursor-pointer items-center gap-2 rounded border border-[var(--forum-border)] bg-[var(--forum-bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--forum-text-secondary)] hover:bg-[var(--forum-hover)]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21.44 11.05l-8.49 8.49a5.5 5.5 0 0 1-7.78-7.78l9.19-9.19a3.5 3.5 0 1 1 4.95 4.95l-9.2 9.19a1.5 1.5 0 0 1-2.12-2.12l8.48-8.48" />
          </svg>
          Attach files
        </label>
      </div>
      {attachments.length > 0 && (
        <p className="mt-1 text-xs text-[var(--forum-text-muted)]">
          {attachments.length} file attachment{attachments.length === 1 ? "" : "s"} selected.
        </p>
      )}
      {previewContent && (
        <div className="mt-3 rounded border border-[var(--forum-border)] bg-[var(--forum-bg-secondary)] p-3">
          <p className="mb-1 text-xs font-medium text-[var(--forum-text-muted)]">Preview</p>
          <MarkdownContent
            content={previewContent}
            className="text-sm leading-relaxed text-[var(--forum-text-primary)]"
          />
        </div>
      )}
      {error && <p className="mt-2 text-sm text-[var(--forum-error)]">{error}</p>}
      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={isPending || isUploadingAttachments || (!previewContent && attachments.length === 0)}
          className="forum-button disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploadingAttachments ? "Uploading files..." : isPending ? "Submitting..." : "Post"}
        </button>
      </div>
    </form>
  );
}
