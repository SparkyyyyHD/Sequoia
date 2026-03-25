"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface PostFormProps {
  category: string;
  subcategory: string;
}

export default function PostForm({ category, subcategory }: PostFormProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = content.trim();
    if (!trimmed) return;

    const { error: insertError } = await supabase.from("posts").insert({
      category,
      subcategory,
      content: trimmed,
      author_name: authorName.trim() || null,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setContent("");
    setAuthorName("");
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="forum-card mt-4 p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:w-40 sm:shrink-0">
          <label
            htmlFor="post-author"
            className="mb-1 block text-xs font-medium text-[var(--forum-text-secondary)]"
          >
            Name <span className="font-normal text-[var(--forum-text-muted)]">(optional)</span>
          </label>
          <input
            id="post-author"
            type="text"
            placeholder="Anonymous"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="forum-input"
          />
        </div>
        <div className="flex-1">
          <label
            htmlFor="post-body"
            className="mb-1 block text-xs font-medium text-[var(--forum-text-secondary)]"
          >
            Message
          </label>
          <textarea
            id="post-body"
            placeholder="Write your post..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            required
            className="forum-input min-h-[4.5rem] resize-y"
          />
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-[var(--forum-error)]">{error}</p>}
      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={isPending || !content.trim()}
          className="forum-button disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Submitting..." : "Post"}
        </button>
      </div>
    </form>
  );
}
