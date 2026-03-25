import { supabase } from "@/lib/supabase";

export type Comment = {
  id: string;
  post_id: string;
  parent_id: string | null;
  content: string;
  author_name: string | null;
  created_at: string;
  like_count: number;
};

export async function fetchComments(postId: string): Promise<Comment[]> {
  const { data } = await supabase
    .from("comments")
    .select("id, post_id, parent_id, content, author_name, created_at, like_count")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  return (data ?? []) as Comment[];
}
