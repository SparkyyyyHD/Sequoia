import { notFound, redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getLifeSkillNode,
  getLifeSkillPillar,
  getLifeSkillPillarBySkillSlug,
} from "@/lib/skillTrees";
import JoinedSectionFeed from "@/components/JoinedSectionFeed";
import JoinForumButton from "@/components/JoinForumButton";
import { POST_LIST_FIELDS } from "@/lib/postSelect";

export default async function ForumLifeSkillPage({
  params,
}: {
  params: Promise<{ skill: string }>;
}) {
  const { skill } = await params;
  const sectionMeta = getLifeSkillPillar(skill);
  const skillMeta = getLifeSkillNode(skill);

  if (!sectionMeta && !skillMeta) {
    notFound();
  }

  if (!sectionMeta && skillMeta) {
    const pillar = getLifeSkillPillarBySkillSlug(skill);
    if (!pillar) notFound();
    redirect(`/forum/life-advice/${pillar.slug}`);
  }

  if (!sectionMeta) {
    notFound();
  }

  const sectionSkills = sectionMeta.nodes;
  const postSubsections = [sectionMeta.slug, ...sectionMeta.nodes.map((node) => node.slug)];
  const { data: posts } = await supabase
    .from("posts")
    .select(POST_LIST_FIELDS)
    .eq("category", "life-advice")
    .in("subcategory", postSubsections)
    .order("created_at", { ascending: false });

  return (
    <>
      <header className="forum-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="forum-kicker">Life advice</p>
            <h1 className="mt-0.5 text-lg font-semibold text-[var(--forum-text-primary)]">
              {sectionMeta.label}
            </h1>
            <p className="mt-1 text-sm text-[var(--forum-text-secondary)]">
              {sectionMeta.description}
            </p>
            <p className="mt-2 text-xs text-[var(--forum-text-muted)]">
              Topics are tags for posts—everything lives in this section. Use search and filters below.
            </p>
          </div>
          <div className="flex items-center gap-1">
            <JoinForumButton category="life-advice" subsection={sectionMeta.slug} />
          </div>
        </div>
      </header>

      <JoinedSectionFeed
        category="life-advice"
        subcategory={sectionMeta.slug}
        posts={(posts ?? [])}
        showSubsectionLink
        feedNodeOptions={[
          { value: "", label: "All topics" },
          { value: sectionMeta.slug, label: "General" },
          ...sectionSkills.map((node) => ({
            value: node.slug,
            label: node.label,
          })),
        ]}
        lockedMessage={`Join ${sectionMeta.label} to read and post in this section.`}
      />
    </>
  );
}
