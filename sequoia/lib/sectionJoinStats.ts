import { cache } from "react";
import { supabase } from "@/lib/supabase";
import {
  getLifeSectionSlug,
  isTechnicalFieldSlug,
  parseTechnicalSkillSubsection,
} from "@/lib/skillTrees";

export interface SectionActivityStats {
  postCount: number;
  contributorCount: number;
}

function bump(
  map: Map<string, { count: number; authors: Set<string> }>,
  key: string,
  authorName: string | null,
) {
  let entry = map.get(key);
  if (!entry) {
    entry = { count: 0, authors: new Set() };
    map.set(key, entry);
  }
  entry.count += 1;
  const name = authorName?.trim();
  if (name) entry.authors.add(name);
}

function technicalFieldFromSubcategory(subcategory: string): string | null {
  if (isTechnicalFieldSlug(subcategory)) return subcategory;
  const parsed = parseTechnicalSkillSubsection(subcategory);
  return parsed?.fieldSlug ?? null;
}

/**
 * One query, then aggregate posts into life pillars and technical fields.
 */
export const loadForumSectionActivity = cache(async (): Promise<{
  lifeByPillar: Record<string, SectionActivityStats>;
  technicalByField: Record<string, SectionActivityStats>;
}> => {
  const { data, error } = await supabase
    .from("posts")
    .select("category, subcategory, author_name")
    .in("category", ["life-advice", "technical-advice"]);

  if (error || !data) {
    return { lifeByPillar: {}, technicalByField: {} };
  }

  const lifeAcc = new Map<string, { count: number; authors: Set<string> }>();
  const techAcc = new Map<string, { count: number; authors: Set<string> }>();

  for (const row of data) {
    const sub = row.subcategory;
    if (!sub || typeof sub !== "string") continue;

    if (row.category === "life-advice") {
      const pillar = getLifeSectionSlug(sub);
      if (pillar) bump(lifeAcc, pillar, row.author_name);
      continue;
    }

    if (row.category === "technical-advice") {
      const field = technicalFieldFromSubcategory(sub);
      if (field) bump(techAcc, field, row.author_name);
    }
  }

  const toRecord = (m: Map<string, { count: number; authors: Set<string> }>) => {
    const out: Record<string, SectionActivityStats> = {};
    for (const [k, v] of m) {
      out[k] = { postCount: v.count, contributorCount: v.authors.size };
    }
    return out;
  };

  return {
    lifeByPillar: toRecord(lifeAcc),
    technicalByField: toRecord(techAcc),
  };
});
