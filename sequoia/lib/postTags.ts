import type { Post } from "@/lib/postTypes";

const MAX_TITLE_LEN = 200;
export const MAX_TAGS = 8;
const MAX_TAG_LEN = 40;

/** Optional headline shown above the post body. */
export function normalizePostTitle(raw: string): string {
  return raw.trim().slice(0, MAX_TITLE_LEN);
}

/** Strip leading markdown ATX heading markers from the first line. */
function stripLeadingHeading(line: string): string {
  return line.replace(/^#{1,6}\s*/, "").trim();
}

/** Returns true when a line is solely a markdown image (e.g. `![alt](url)`). */
function isImageOnlyLine(line: string): boolean {
  return /^!\[.*?\]\(.*?\)\s*$/.test(line.trim());
}

/**
 * First line of the post (after optional `#` heading markers) is the display title.
 * Lines that consist only of image markdown are never treated as titles.
 */
export function getPostTitleFromContent(content: string): string | null {
  const raw = content.trim();
  if (!raw) return null;
  const firstLine = raw.split(/\r?\n/)[0] ?? "";
  if (isImageOnlyLine(firstLine)) return null;
  const t = normalizePostTitle(stripLeadingHeading(firstLine));
  return t || null;
}

/** Everything after the first line — avoids duplicating the title in the body. */
export function getPostBodyAfterFirstLine(content: string): string {
  const lines = content.split(/\r?\n/);
  if (lines.length <= 1) return "";
  return lines.slice(1).join("\n").trim();
}

export function getDisplayPostTitle(post: Pick<Post, "title" | "content">): string | null {
  const fromContent = getPostTitleFromContent(post.content ?? "");
  if (fromContent) return fromContent;
  return post.title?.trim() || null;
}

export function getDisplayPostBody(post: Pick<Post, "title" | "content">): string {
  const fromContent = getPostTitleFromContent(post.content ?? "");
  if (fromContent) return getPostBodyAfterFirstLine(post.content ?? "");
  return (post.content ?? "").trim();
}

/**
 * Parse comma / semicolon / newline–separated tags. Dedupes case-insensitively,
 * trims, caps count and length.
 */
export function parseCustomTags(raw: string): string[] {
  const parts = raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const t = p.slice(0, MAX_TAG_LEN);
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

/** Normalize a single tag from user input (add-chip flow). */
export function normalizeSingleTag(raw: string): string | null {
  const t = raw.trim().slice(0, MAX_TAG_LEN);
  return t || null;
}
