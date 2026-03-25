import { redirect } from "next/navigation";

export default async function AgeGroupPage({
  params,
}: {
  params: Promise<{ ageGroup: string }>;
}) {
  const { ageGroup } = await params;
  redirect(`/forum/life-advice/${ageGroup}`);
}
