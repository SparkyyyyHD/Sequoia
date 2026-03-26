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

export interface SkillTier {
  slug: string;
  label: string;
  description: string;
}

export const SKILL_TIERS: SkillTier[] = [
  {
    slug: "level-1",
    label: "Level 1",
    description: "Beginner fundamentals and starter questions.",
  },
  {
    slug: "level-2",
    label: "Level 2",
    description: "Early practice and first troubleshooting wins.",
  },
  {
    slug: "level-3",
    label: "Level 3",
    description: "Intermediate techniques and repeatable results.",
  },
  {
    slug: "level-4",
    label: "Level 4",
    description: "Advanced workflows, speed, and consistency.",
  },
  {
    slug: "level-5",
    label: "Level 5",
    description: "Expert tactics and high-stakes decision making.",
  },
  {
    slug: "level-6",
    label: "Level 6",
    description: "Master-level strategy, mentoring, and refinement.",
  },
];

const TECHNICAL_TIER_SEPARATOR = "__";

export const FORUM_CATEGORIES: ForumCategory[] = [
  {
    slug: "life-advice",
    label: "Life Advice",
    description: "Advice threads tailored by age group.",
    subsections: [
      {
        slug: "under-18",
        label: "Under 18",
        description: "School, confidence, and navigating early life choices.",
      },
      {
        slug: "18-25",
        label: "18-25",
        description: "College, first jobs, money basics, and relationships.",
      },
      {
        slug: "26-35",
        label: "26-35",
        description: "Career momentum, family planning, and long-term goals.",
      },
      {
        slug: "36-50",
        label: "36-50",
        description: "Leadership, parenting, health, and financial strategy.",
      },
      {
        slug: "51-65",
        label: "51-65",
        description: "Transitions, mentoring, retirement preparation, and wellness.",
      },
      {
        slug: "over-65",
        label: "Over 65",
        description: "Community, purpose, longevity, and legacy conversations.",
      },
    ],
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

export function getSkillTier(slug: string): SkillTier | undefined {
  return SKILL_TIERS.find((tier) => tier.slug === slug);
}

export function buildTechnicalTierSubsection(
  fieldSlug: string,
  tierSlug: string
): string {
  return `${fieldSlug}${TECHNICAL_TIER_SEPARATOR}${tierSlug}`;
}

export function parseTechnicalTierSubsection(subsectionSlug: string): {
  fieldSlug: string;
  tierSlug: string;
} | null {
  const [fieldSlug, tierSlug, extra] = subsectionSlug.split(
    TECHNICAL_TIER_SEPARATOR
  );
  if (!fieldSlug || !tierSlug || extra) return null;
  if (!getSkillTier(tierSlug)) return null;
  return { fieldSlug, tierSlug };
}

export function getForumSubsectionHref(
  categorySlug: ForumCategorySlug,
  subsectionSlug: string
): string {
  if (categorySlug === "life-advice") {
    return `/forum/life-advice/${subsectionSlug}`;
  }

  const parsed = parseTechnicalTierSubsection(subsectionSlug);
  if (parsed) {
    return `/forum/technical-advice/${parsed.fieldSlug}/${parsed.tierSlug}`;
  }
  return `/forum/technical-advice/${subsectionSlug}`;
}

export function getSubsectionLabel(
  categorySlug: ForumCategorySlug,
  subsectionSlug: string
): string {
  if (categorySlug === "technical-advice") {
    const parsed = parseTechnicalTierSubsection(subsectionSlug);
    if (parsed) {
      const fieldLabel = getSubsectionLabel("technical-advice", parsed.fieldSlug);
      const tier = getSkillTier(parsed.tierSlug);
      if (tier) return `${fieldLabel} · ${tier.label}`;
    }
  }

  const category = getForumCategory(categorySlug);
  const subsection = category?.subsections.find((item) => item.slug === subsectionSlug);
  return subsection?.label ?? subsectionSlug;
}
