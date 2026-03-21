import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PostList from "@/components/PostList";
import PostForm from "@/components/PostForm";

const AGE_GROUP_LABELS: Record<string, string> = {
  "under-18": "Under 18",
  "18-25": "18–25",
  "26-35": "26–35",
  "36-50": "36–50",
  "51-65": "51–65",
  "over-65": "Over 65",
};

export default async function AgeGroupPage({
  params,
}: {
  params: Promise<{ ageGroup: string }>;
}) {
  const { ageGroup } = await params;
  const label = AGE_GROUP_LABELS[ageGroup] ?? ageGroup;

  const { data: posts } = await supabase
    .from("posts")
    .select("id, content, author_name, created_at")
    .eq("category", "life-advice")
    .eq("subcategory", ageGroup)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/life-advice"
        className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
      >
        &larr; Life Advice
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Life Advice: {label}</h1>

      <PostForm category="life-advice" subcategory={ageGroup} />
      <PostList posts={posts ?? []} />
    </main>
  );
}
