import { notFound, redirect } from "next/navigation";
import { getForumCategory } from "@/lib/forum";
import { getTechnicalSkillNode } from "@/lib/skillTrees";

const TECHNICAL_ADVICE = getForumCategory("technical-advice");

export default async function ForumTechnicalSkillRedirectPage({
  params,
}: {
  params: Promise<{ field: string; skill: string }>;
}) {
  const { field, skill } = await params;

  const fieldExists = TECHNICAL_ADVICE?.subsections.some((item) => item.slug === field);
  const skillMeta = getTechnicalSkillNode(field, skill);
  if (!fieldExists || !skillMeta) {
    notFound();
  }

  redirect(`/forum/technical-advice/${field}`);
}
