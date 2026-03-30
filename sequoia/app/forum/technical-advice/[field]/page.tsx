import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getForumCategory,
  getSubsectionLabel,
} from "@/lib/forum";
import {
  buildTechnicalSkillSubsection,
  TECHNICAL_SKILL_TREES,
  topoSortSkillTree,
  type TechnicalFieldSlug,
} from "@/lib/skillTrees";
import JoinedSectionFeed from "@/components/JoinedSectionFeed";
import FavoriteButton from "@/components/FavoriteButton";
import JoinForumButton from "@/components/JoinForumButton";
import { POST_LIST_FIELDS } from "@/lib/postSelect";

const TECHNICAL_ADVICE = getForumCategory("technical-advice");

export default async function ForumFieldPage({
  params,
}: {
  params: Promise<{ field: string }>;
}) {
  const { field } = await params;

  if (!TECHNICAL_ADVICE?.subsections.some((item) => item.slug === field)) {
    notFound();
  }

  const tree = TECHNICAL_SKILL_TREES[field as TechnicalFieldSlug];
  if (!tree) {
    notFound();
  }

  const orderedSkills = topoSortSkillTree(tree);
  const sectionSubsections = [
    field,
    ...orderedSkills.map((skill) => buildTechnicalSkillSubsection(field, skill.slug)),
  ];

  const { data: posts } = await supabase
    .from("posts")
    .select(POST_LIST_FIELDS)
    .eq("category", "technical-advice")
    .in("subcategory", sectionSubsections)
    .order("created_at", { ascending: false });

  const label = getSubsectionLabel("technical-advice", field);

  return (
    <>
      <header className="forum-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="forum-kicker">Technical advice</p>
            <h1 className="mt-0.5 text-lg font-semibold text-[var(--forum-text-primary)]">
              {label}
            </h1>
            <p className="mt-1 text-sm text-[var(--forum-text-secondary)]">
              One section for the whole field. Skill names are tags on posts—use search, the menu, or
              topic chips to narrow the feed.
            </p>
          </div>
          <div className="flex items-center gap-1">
            <JoinForumButton category="technical-advice" subsection={field} />
            <FavoriteButton category="technical-advice" subsection={field} />
          </div>
        </div>
      </header>

      <JoinedSectionFeed
        category="technical-advice"
        subcategory={field}
        posts={(posts ?? [])}
        showSubsectionLink
        feedNodeOptions={[
          { value: "", label: "All threads" },
          { value: field, label: "General" },
          ...orderedSkills.map((skill) => ({
            value: buildTechnicalSkillSubsection(field, skill.slug),
            label: skill.label,
          })),
        ]}
        lockedMessage={`Join ${label} to read and post in this section.`}
      />
    </>
  );
}
