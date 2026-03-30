import { getLifeSectionSlug, parseTechnicalSkillSubsection } from "@/lib/skillTrees";

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

export function getForumSectionSlug(category: string, subsection: string): string {
  if (category === "life-advice") {
    return getLifeSectionSlug(subsection) ?? subsection;
  }

  if (category === "technical-advice") {
    return parseTechnicalSkillSubsection(subsection)?.fieldSlug ?? subsection;
  }

  return subsection;
}

export function getForumSectionKey(category: string, subsection: string): string {
  return forumKey(category, getForumSectionSlug(category, subsection));
}

function normalizeJoinedForums(keys: string[]): string[] {
  return [...new Set(
    keys
      .map((key) => {
        const parsed = parseForumKey(key);
        if (!parsed) return null;
        return getForumSectionKey(parsed.category, parsed.subsection);
      })
      .filter((key): key is string => Boolean(key))
  )];
}

export function getJoinedForums(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    const normalized = normalizeJoinedForums(parsed);
    if (normalized.join("|") !== parsed.join("|")) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }
    return new Set(normalized);
  } catch {
    return new Set();
  }
}

export function toggleJoinedForum(key: string): Set<string> {
  const current = getJoinedForums();
  const normalizedKey = (() => {
    const parsed = parseForumKey(key);
    if (!parsed) return key;
    return getForumSectionKey(parsed.category, parsed.subsection);
  })();

  if (current.has(normalizedKey)) {
    current.delete(normalizedKey);
  } else {
    current.add(normalizedKey);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...current]));
  window.dispatchEvent(new Event(JOINED_FORUMS_CHANGE_EVENT));
  return current;
}
