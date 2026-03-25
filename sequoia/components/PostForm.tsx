"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

interface PostFormProps {
  category: string;
  subcategory: string;
}

export default function PostForm({ category, subcategory }: PostFormProps) {
  const router = useRouter();
  const { user, displayName, loading } = useAuth();
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (loading) return null;

  if (!user) {
    return (
      <div className="forum-card mt-4 p-4 text-sm text-[var(--forum-text-secondary)]">
        <Link href="/login" className="forum-link font-semibold">
          Sign in
        </Link>{" "}
        to leave a post.
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = content.trim();
    if (!trimmed) return;

    const { error: insertError } = await supabase.from("posts").insert({
      category,
      subcategory,
      content: trimmed,
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
        required
        className="forum-input min-h-[4.5rem] resize-y"
      />
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
