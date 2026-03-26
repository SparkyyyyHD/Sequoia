const STORAGE_KEY = "sequoia_joined_forums";
export const JOINED_FORUMS_CHANGE_EVENT = "forum:joined-change";

export function forumKey(category: string, subsection: string): string {
  return `${category}/${subsection}`;
}

export function parseForumKey(key: string): {
  category: string;
  subsection: string;
} | null {
  const slash = key.indexOf("/");
  if (slash <= 0 || slash >= key.length - 1) return null;
  return {
    category: key.slice(0, slash),
    subsection: key.slice(slash + 1),
  };
}

export function getJoinedForums(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function toggleJoinedForum(key: string): Set<string> {
  const current = getJoinedForums();
  if (current.has(key)) {
    current.delete(key);
  } else {
    current.add(key);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...current]));
  window.dispatchEvent(new Event(JOINED_FORUMS_CHANGE_EVENT));
  return current;
}
