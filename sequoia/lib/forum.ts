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

export function getSubsectionLabel(
  categorySlug: ForumCategorySlug,
  subsectionSlug: string
): string {
  const category = getForumCategory(categorySlug);
  const subsection = category?.subsections.find((item) => item.slug === subsectionSlug);
  return subsection?.label ?? subsectionSlug;
}
