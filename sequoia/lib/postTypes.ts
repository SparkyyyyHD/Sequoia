export type Post = {
  id: string;
  content: string;
  author_name: string | null;
  created_at: string;
  helpful_count?: number | null;
  not_helpful_count?: number | null;
  category?: string | null;
  subcategory?: string | null;
  /** Optional headline (distinct from section topic tag). */
  title?: string | null;
  /** User-defined labels for filtering and discovery. */
  custom_tags?: string[] | null;
};
