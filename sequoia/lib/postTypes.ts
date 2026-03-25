export type Post = {
  id: string;
  content: string;
  author_name: string | null;
  created_at: string;
  helpful_count?: number | null;
  not_helpful_count?: number | null;
  category?: string | null;
  subcategory?: string | null;
};
