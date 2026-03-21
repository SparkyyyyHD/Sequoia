interface Post {
  id: string;
  content: string;
  author_name: string | null;
  created_at: string;
}

interface PostListProps {
  posts: Post[];
}

export default function PostList({ posts }: PostListProps) {
  if (posts.length === 0) {
    return (
      <p className="mt-4 text-sm text-neutral-500">
        No posts yet. Be the first to share some advice!
      </p>
    );
  }

  return (
    <ul className="mt-4 space-y-4">
      {posts.map((post) => (
        <li
          key={post.id}
          className="rounded-md border border-neutral-200 p-4 dark:border-neutral-800"
        >
          <p className="whitespace-pre-wrap text-sm">{post.content}</p>
          <p className="mt-2 text-xs text-neutral-500">
            {post.author_name ?? "Anonymous"} &middot;{" "}
            {new Date(post.created_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        </li>
      ))}
    </ul>
  );
}
