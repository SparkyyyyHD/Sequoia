import {
  buildTechnicalSkillSubsection,
  getLifeSkillPillar,
  getLifeSkillNode,
  getLifeSectionSlug,
  getTechnicalSkillNode,
  parseTechnicalSkillSubsection,
  LIFE_SKILL_TREE,
} from "@/lib/skillTrees";

export type ForumCategorySlug = "life-advice" | "technical-advice";

export interface ForumSubsection {
  slug: string;
  label: string;
  description: string;
}

export interface ForumCategory {
  slug: ForumCategorySlug;
  label: string;
  description: string;
  subsections: ForumSubsection[];
}

export const FORUM_CATEGORIES: ForumCategory[] = [
  {
    slug: "life-advice",
    label: "Life Advice",
    description: "Life skills with prerequisites—relationships, school, work, money, and more.",
    subsections: LIFE_SKILL_TREE.map((n) => ({
      slug: n.slug,
      label: n.label,
      description: n.description,
    })),
  },
  {
    slug: "technical-advice",
    label: "Technical Advice",
    description: "Hands-on help across practical technical fields.",
    subsections: [
      {
        slug: "fishing",
        label: "Fishing",
        description: "Gear setup, seasonal strategy, and water conditions.",
      },
      {
        slug: "hunting",
        label: "Hunting",
        description: "Ethical practices, field prep, and equipment questions.",
      },
      {
        slug: "welding",
        label: "Welding",
        description: "Process selection, safety habits, and troubleshooting joints.",
      },
      {
        slug: "woodworking",
        label: "Woodworking",
        description: "Tooling, joinery, finishes, and workshop techniques.",
      },
      {
        slug: "automotive",
        label: "Automotive",
        description: "Diagnostics, maintenance plans, and repair know-how.",
      },
      {
        slug: "electronics",
        label: "Electronics",
        description: "Circuits, components, soldering, and project debugging.",
      },
      {
        slug: "plumbing",
        label: "Plumbing",
        description: "Piping systems, fixtures, pressure issues, and fixes.",
      },
      {
        slug: "cooking",
        label: "Cooking",
        description: "Technique, meal prep, timing, and kitchen workflow.",
      },
    ],
  },
];

export function getForumCategory(slug: string): ForumCategory | undefined {
  return FORUM_CATEGORIES.find((category) => category.slug === slug);
}

/** @deprecated Use buildTechnicalSkillSubsection from skillTrees; kept for gradual migration. */
export function buildTechnicalTierSubsection(
  fieldSlug: string,
  skillSlug: string
): string {
  return buildTechnicalSkillSubsection(fieldSlug, skillSlug);
}

/** @deprecated Use parseTechnicalSkillSubsection from skillTrees. */
export function parseTechnicalTierSubsection(subsectionSlug: string): {
  fieldSlug: string;
  skillSlug: string;
} | null {
  return parseTechnicalSkillSubsection(subsectionSlug);
}

/** Section-level forum URL only (no per-skill / per-node routes). */
export function getForumSubsectionHref(
  categorySlug: ForumCategorySlug,
  subsectionSlug: string
): string {
  if (categorySlug === "life-advice") {
    const pillar = getLifeSectionSlug(subsectionSlug);
    return `/forum/life-advice/${pillar ?? subsectionSlug}`;
  }

  const parsed = parseTechnicalSkillSubsection(subsectionSlug);
  if (parsed) {
    return `/forum/technical-advice/${parsed.fieldSlug}`;
  }
  return `/forum/technical-advice/${subsectionSlug}`;
}

export function getSubsectionLabel(
  categorySlug: ForumCategorySlug,
  subsectionSlug: string
): string {
  if (categorySlug === "life-advice") {
    const pillar = getLifeSkillPillar(subsectionSlug);
    if (pillar) return pillar.label;
    const node = getLifeSkillNode(subsectionSlug);
    if (node) return node.label;
  }

  if (categorySlug === "technical-advice") {
    const parsed = parseTechnicalSkillSubsection(subsectionSlug);
    if (parsed) {
      const fieldLabel = getSubsectionLabel("technical-advice", parsed.fieldSlug);
      const skill = getTechnicalSkillNode(parsed.fieldSlug, parsed.skillSlug);
      if (skill) return `${fieldLabel} · ${skill.label}`;
    }
  }

  const category = getForumCategory(categorySlug);
  const subsection = category?.subsections.find((item) => item.slug === subsectionSlug);
  return subsection?.label ?? subsectionSlug;
}
