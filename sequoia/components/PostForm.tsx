"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import MarkdownContent from "@/components/MarkdownContent";
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
  const [isPending, startTransition] = useTransition();
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
    if (!finalContent) return;

    const { error: insertError } = await supabase.from("posts").insert({
      category,
      subcategory,
      content: finalContent,
      author_name: displayName,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setContent("");
    startTransition(() => {
      router.refresh();
    });
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
          disabled={isPending || !previewContent}
          className="forum-button disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Submitting..." : "Post"}
        </button>
      </div>
    </form>
  );
}
