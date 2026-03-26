import { redirect } from "next/navigation";

export default async function LegacyLifeAdviceRedirect({
  params,
}: {
  params: Promise<{ skill: string }>;
}) {
  const { skill } = await params;
  redirect(`/forum/life-advice/${skill}`);
}
