import { supabase } from "@/lib/supabase";
import type { Post } from "@/lib/postTypes";

/**
 * Fetches candidate posts for the recommendation engine.
 * Returns a larger set than what is ultimately displayed so the client-side
 * scoring algorithm (net votes + recency + favorites) has room to re-rank.
 */
export async function getRecommendedCandidates(limit = 40): Promise<Post[]> {
  const { data } = await supabase
    .from("posts")
    .select(
      "id, content, author_name, created_at, helpful_count, not_helpful_count, category, subcategory"
    )
    .order("helpful_count", { ascending: false })
    .limit(limit);

  return (data ?? []) as Post[];
}
