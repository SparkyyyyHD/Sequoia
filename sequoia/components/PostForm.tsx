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
    <form onSubmit={handleSubmit} className="mt-6 space-y-3">
      <div>
        <input
          type="text"
          placeholder="Name (optional)"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:border-neutral-700"
        />
      </div>
      <div>
        <textarea
          placeholder="Share some advice..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          required
          className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:border-neutral-700"
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={isPending || !content.trim()}
        className="rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300"
      >
        {isPending ? "Posting..." : "Post"}
      </button>
    </form>
  );
}
