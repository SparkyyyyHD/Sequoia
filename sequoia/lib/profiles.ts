import { supabase } from "@/lib/supabase";

/**
 * Fetch avatar URLs for a list of usernames in a single query.
 * Returns a map of username -> avatar_url.
 */
export async function fetchAvatarUrls(
  usernames: string[]
): Promise<Record<string, string>> {
  const unique = [...new Set(usernames.filter(Boolean))];
  if (unique.length === 0) return {};

  const { data } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .in("username", unique);

  const map: Record<string, string> = {};
  for (const row of (data ?? []) as { username: string; avatar_url: string }[]) {
    map[row.username] = row.avatar_url;
  }
  return map;
}

/**
 * Persist an avatar URL for a username.  Called after every successful upload
 * so that posts/comments automatically reflect the latest photo.
 */
export async function upsertAvatarUrl(
  username: string,
  avatarUrl: string
): Promise<void> {
  await supabase.from("profiles").upsert(
    { username, avatar_url: avatarUrl, updated_at: new Date().toISOString() },
    { onConflict: "username" }
  );
}
