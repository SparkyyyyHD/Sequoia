import { supabase } from "@/lib/supabase";
import type { Post } from "@/lib/postTypes";
import { POST_LIST_FIELDS } from "@/lib/postSelect";

/**
 * Fetches candidate posts for the recommendation engine.
 * Returns a larger recent pool than what is ultimately displayed so the client
 * can do a semi-random, per-refresh ranking without being dominated by likes.
 */
export async function getRecommendedCandidates(limit = 120): Promise<Post[]> {
  const { data } = await supabase
    .from("posts")
    .select(POST_LIST_FIELDS)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as Post[];
}
