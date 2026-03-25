import { getRecommendedCandidates } from "@/lib/recommendedPosts";
import RecommendedPosts from "@/components/RecommendedPosts";

export default async function ForumHomePage() {
  const candidates = await getRecommendedCandidates(40);

  return (
    <>
      <header className="forum-card p-4 sm:p-5">
        <h1 className="text-lg font-semibold text-[var(--forum-text-primary)]">Forum</h1>
      </header>

      <section className="mt-4">
        <RecommendedPosts candidates={candidates} limit={20} />
      </section>
    </>
  );
}
