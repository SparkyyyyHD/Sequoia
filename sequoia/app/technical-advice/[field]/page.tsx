import { redirect } from "next/navigation";

export default async function FieldPage({
  params,
}: {
  params: Promise<{ field: string }>;
}) {
  const { field } = await params;
  redirect(`/forum/technical-advice/${field}`);
}
