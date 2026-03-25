const STORAGE_KEY = "sequoia_forum_favorites";
export const FAVORITES_CHANGE_EVENT = "forum:favorites-change";

export function subsectionKey(category: string, subsection: string): string {
  return `${category}/${subsection}`;
}

export function getFavorites(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function toggleFavorite(key: string): Set<string> {
  const current = getFavorites();
  if (current.has(key)) {
    current.delete(key);
  } else {
    current.add(key);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...current]));
  window.dispatchEvent(new Event(FAVORITES_CHANGE_EVENT));
  return current;
}
