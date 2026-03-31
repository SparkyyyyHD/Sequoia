import { supabase } from "@/lib/supabase";
import { sequoiaPointsFromPostRow } from "@/lib/sequoiaBadges";

/**
 * Lifetime Sequoia points per author (sum of helpful − not helpful on all posts).
 * Paginates so large post histories still aggregate correctly.
 */
export async function fetchAuthorSequoiaPoints(
  usernames: string[]
): Promise<Record<string, number>> {
  const unique = [...new Set(usernames.filter(Boolean))];
  if (unique.length === 0) return {};

  const sums: Record<string, number> = Object.fromEntries(unique.map((n) => [n, 0]));

  let from = 0;
  const pageSize = 1000;

  for (;;) {
    const { data, error } = await supabase
      .from("posts")
      .select("author_name, helpful_count, not_helpful_count")
      .in("author_name", unique)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) break;

    const rows = (data ?? []) as {
      author_name: string | null;
      helpful_count?: number | null;
      not_helpful_count?: number | null;
    }[];

    if (rows.length === 0) break;

    for (const row of rows) {
      const name = row.author_name;
      if (!name || !(name in sums)) continue;
      sums[name] += sequoiaPointsFromPostRow(row.helpful_count, row.not_helpful_count);
    }

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return sums;
}
