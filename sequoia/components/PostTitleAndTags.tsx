import type { Post } from "@/lib/postTypes";
import { getDisplayPostTitle } from "@/lib/postTags";

export default function PostTitleAndTags({
  post,
  headingLevel = 2,
  className,
}: {
  post: Pick<Post, "title" | "custom_tags" | "content">;
  headingLevel?: 1 | 2;
  className?: string;
}) {
  const t = getDisplayPostTitle(post);
  const tags = post.custom_tags?.filter(Boolean) ?? [];
  if (!t && tags.length === 0) return null;

  const Heading = headingLevel === 1 ? "h1" : "h2";

  return (
    <div className={className ? `min-w-0 ${className}` : "min-w-0"}>
      {t && (
        <Heading className="forum-post-title text-[var(--forum-text-primary)]">{t}</Heading>
      )}
      {tags.length > 0 && (
        <div className={`forum-post-custom-tags ${t ? "mt-1.5" : "mt-0"}`}>
          {tags.map((tag) => (
            <span key={tag} className="forum-post-custom-tag">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
