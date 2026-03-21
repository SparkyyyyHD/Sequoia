import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PostList from "@/components/PostList";
import PostForm from "@/components/PostForm";

const FIELD_LABELS: Record<string, string> = {
  fishing: "Fishing",
  hunting: "Hunting",
  welding: "Welding",
  woodworking: "Woodworking",
  automotive: "Automotive",
  electronics: "Electronics",
  plumbing: "Plumbing",
  cooking: "Cooking",
};

export default async function FieldPage({
  params,
}: {
  params: Promise<{ field: string }>;
}) {
  const { field } = await params;
  const label = FIELD_LABELS[field] ?? field;

  const { data: posts } = await supabase
    .from("posts")
    .select("id, content, author_name, created_at")
    .eq("category", "technical-advice")
    .eq("subcategory", field)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/technical-advice"
        className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
      >
        &larr; Technical Advice
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Technical Advice: {label}</h1>

      <PostForm category="technical-advice" subcategory={field} />
      <PostList posts={posts ?? []} />
    </main>
  );
}
