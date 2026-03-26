"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import {
  getForumSubsectionHref,
  getSkillTier,
  getSubsectionLabel,
  parseTechnicalTierSubsection,
  type ForumCategorySlug,
} from "@/lib/forum";
import { getJoinedForums, parseForumKey, JOINED_FORUMS_CHANGE_EVENT } from "@/lib/joinedForums";
import type { Post } from "@/lib/postTypes";

export default function AccountPage() {
  const { user, loading, isGuest, displayName } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [joinedForums, setJoinedForums] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setJoinedForums(getJoinedForums());

    function onJoinedChange() {
      setJoinedForums(getJoinedForums());
    }

    window.addEventListener(JOINED_FORUMS_CHANGE_EVENT, onJoinedChange);
    return () => window.removeEventListener(JOINED_FORUMS_CHANGE_EVENT, onJoinedChange);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!displayName) {
        setPosts([]);
        return;
      }

      setPending(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("posts")
        .select(
          "id, content, author_name, created_at, helpful_count, not_helpful_count, category, subcategory"
        )
        .eq("author_name", displayName)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setPosts([]);
      } else {
        setPosts((data ?? []) as Post[]);
      }

      setPending(false);
    }

    if (!loading && (user || isGuest)) {
      load();
    }

    return () => {
      cancelled = true;
    };
  }, [displayName, isGuest, loading, user]);

  const stats = useMemo(() => {
    const helpful = posts.reduce((sum, p) => sum + (p.helpful_count ?? 0), 0);
    const notHelpful = posts.reduce((sum, p) => sum + (p.not_helpful_count ?? 0), 0);
    const points = helpful - notHelpful;

    return {
      helpful,
      notHelpful,
      points,
      totalPosts: posts.length,
    };
  }, [posts]);

  interface LifeAdviceGroup {
    groupSlug: string;
    groupLabel: string;
    postCount: number;
    href: string;
  }
  const joinedLifeAdviceGroups: LifeAdviceGroup[] = useMemo(() => {
    const postsBySubsection = new Map<string, number>();
    for (const post of posts) {
      if (post.category !== "life-advice" || !post.subcategory) continue;
      postsBySubsection.set(
        post.subcategory,
        (postsBySubsection.get(post.subcategory) ?? 0) + 1
      );
    }

    const byGroup = new Map<
      string,
      {
        groupSlug: string;
        groupLabel: string;
        postCount: number;
        href: string;
      }
    >();

    for (const key of joinedForums) {
      const parsedKey = parseForumKey(key);
      if (!parsedKey || parsedKey.category !== "life-advice") continue;

      const groupLabel = getSubsectionLabel("life-advice", parsedKey.subsection);
      const postCount = postsBySubsection.get(parsedKey.subsection) ?? 0;
      const href = getForumSubsectionHref("life-advice", parsedKey.subsection);

      byGroup.set(parsedKey.subsection, {
        groupSlug: parsedKey.subsection,
        groupLabel,
        postCount,
        href,
      });
    }

    return [...byGroup.values()].sort((a, b) => a.groupLabel.localeCompare(b.groupLabel));
  }, [joinedForums, posts]);

  const joinedTechnicalSkills = useMemo(() => {
    const postsBySubsection = new Map<string, number>();
    for (const post of posts) {
      if (post.category !== "technical-advice" || !post.subcategory) continue;
      postsBySubsection.set(
        post.subcategory,
        (postsBySubsection.get(post.subcategory) ?? 0) + 1
      );
    }

    const byField = new Map<
      string,
      {
        fieldSlug: string;
        fieldLabel: string;
        tierLabel: string;
        tierRank: number;
        postCount: number;
        href: string;
      }
    >();

    for (const key of joinedForums) {
      const parsedKey = parseForumKey(key);
      if (!parsedKey || parsedKey.category !== "technical-advice") continue;

      const parsedTier = parseTechnicalTierSubsection(parsedKey.subsection);
      if (!parsedTier) continue;

      const tierMeta = getSkillTier(parsedTier.tierSlug);
      if (!tierMeta) continue;

      const tierRank = Number(tierMeta.slug.replace("level-", ""));
      const fieldLabel = getSubsectionLabel("technical-advice", parsedTier.fieldSlug);
      const postCount = postsBySubsection.get(parsedKey.subsection) ?? 0;
      const href = getForumSubsectionHref("technical-advice", parsedKey.subsection);

      const current = byField.get(parsedTier.fieldSlug);
      if (!current || tierRank > current.tierRank) {
        byField.set(parsedTier.fieldSlug, {
          fieldSlug: parsedTier.fieldSlug,
          fieldLabel,
          tierLabel: tierMeta.label,
          tierRank,
          postCount,
          href,
        });
      }
    }

    return [...byField.values()].sort((a, b) => a.fieldLabel.localeCompare(b.fieldLabel));
  }, [joinedForums, posts]);

  if (loading) {
    return (
      <main className="forum-page">
        <div className="forum-shell">
          <div className="forum-card p-4">
            <p className="text-sm text-[var(--forum-text-muted)]">Loading account...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!user && !isGuest) {
    return (
      <main className="forum-page">
        <div className="forum-shell">
          <header className="forum-card p-4 sm:p-5">
            <h1 className="text-lg font-semibold text-[var(--forum-text-primary)]">
              Account dashboard
            </h1>
            <p className="mt-1 text-sm text-[var(--forum-text-secondary)]">
              Sign in to view your Sequoia points and post activity.
            </p>
            <Link href="/login" className="forum-cta mt-3 inline-block">
              Go to login
            </Link>
          </header>
        </div>
      </main>
    );
  }

  return (
    <main className="forum-page">
      <div className="forum-shell">
        <header className="forum-card p-4 sm:p-5">
          <p className="forum-kicker">Account</p>
          <h1 className="mt-0.5 text-lg font-semibold text-[var(--forum-text-primary)]">
            {displayName}
          </h1>
          <p className="mt-1 text-sm text-[var(--forum-text-secondary)]">
            Sequoia points are earned when other users find your posts helpful, and lost when they find them unhelpful. Points are a reflection of your overall contribution to the community, but remember that every post is an opportunity to share your unique perspective and advice.
          </p>
        </header>

        <section className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <article className="forum-subsection-card p-3">
            <p className="forum-section-label">Sequoia points</p>
            <p className="mt-1 text-xl font-semibold text-[var(--forum-text-primary)]">
              {stats.points}
            </p>
          </article>
          <article className="forum-subsection-card p-3">
            <p className="forum-section-label">Helpful</p>
            <p className="mt-1 text-xl font-semibold text-[var(--forum-text-primary)]">
              {stats.helpful}
            </p>
          </article>
          <article className="forum-subsection-card p-3">
            <p className="forum-section-label">Not helpful</p>
            <p className="mt-1 text-xl font-semibold text-[var(--forum-text-primary)]">
              {stats.notHelpful}
            </p>
          </article>
          <article className="forum-subsection-card p-3">
            <p className="forum-section-label">Posts</p>
            <p className="mt-1 text-xl font-semibold text-[var(--forum-text-primary)]">
              {stats.totalPosts}
            </p>
          </article>
        </section>


        <section className="mt-4 forum-card p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-[var(--forum-text-primary)]">
            Joined technical skills
          </h2>
          <p className="mt-0.5 text-xs text-[var(--forum-text-secondary)]">
            Your current tier for each technical skill you joined, and how much you posted there.
          </p>

          {joinedTechnicalSkills.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--forum-text-muted)]">
              Join a technical tier forum to start tracking your skill tiers.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {joinedTechnicalSkills.map((skill) => (
                <li key={skill.fieldSlug} className="forum-subsection-card p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[var(--forum-text-primary)]">
                        {skill.fieldLabel}
                      </p>
                      <p className="text-xs text-[var(--forum-text-secondary)]">
                        Tier: {skill.tierLabel}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-[var(--forum-text-primary)]">
                        {skill.postCount}
                      </p>
                      <p className="text-xs text-[var(--forum-text-muted)]">posts</p>
                    </div>
                  </div>
                  <Link href={skill.href} className="forum-link mt-2 inline-block text-xs">
                    Open joined tier forum
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-4 forum-card p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-[var(--forum-text-primary)]">
            Joined life advice groups
          </h2>
          <p className="mt-0.5 text-xs text-[var(--forum-text-secondary)]">
            Your joined life advice age groups and how much you posted there.
          </p>

          {joinedLifeAdviceGroups.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--forum-text-muted)]">
              Join a life advice forum to start tracking your activity.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {joinedLifeAdviceGroups.map((group: LifeAdviceGroup) => (
                <li key={group.groupSlug} className="forum-subsection-card p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[var(--forum-text-primary)]">
                        {group.groupLabel}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-[var(--forum-text-primary)]">
                        {group.postCount}
                      </p>
                      <p className="text-xs text-[var(--forum-text-muted)]">posts</p>
                    </div>
                  </div>
                  <Link href={group.href} className="forum-link mt-2 inline-block text-xs">
                    Open joined group forum
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-4 forum-card p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-[var(--forum-text-primary)]">
            Recent posts
          </h2>

          {pending && (
            <p className="mt-2 text-sm text-[var(--forum-text-muted)]">Loading posts...</p>
          )}
          {error && <p className="mt-2 text-sm text-[var(--forum-error)]">{error}</p>}

          {!pending && !error && posts.length === 0 && (
            <p className="mt-2 text-sm text-[var(--forum-text-muted)]">
              No posts yet. Jump into a forum and share your advice.
            </p>
          )}

          {!pending && !error && posts.length > 0 && (
            <ul className="mt-3 space-y-2">
              {posts.slice(0, 20).map((post) => {
                const category =
                  post.category === "life-advice" || post.category === "technical-advice"
                    ? (post.category as ForumCategorySlug)
                    : null;
                const subsection = post.subcategory;
                const label =
                  category && subsection
                    ? getSubsectionLabel(category, subsection)
                    : "General";
                const href =
                  category && subsection
                    ? `${getForumSubsectionHref(category, subsection)}#post-${post.id}`
                    : null;

                return (
                  <li key={post.id} className="forum-subsection-card p-3">
                    <p className="text-xs text-[var(--forum-text-muted)]">{label}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--forum-text-primary)]">
                      {post.content}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--forum-text-muted)]">
                      <span>
                        {new Date(post.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span>+{post.helpful_count ?? 0} helpful</span>
                      <span>-{post.not_helpful_count ?? 0} not helpful</span>
                      {href && (
                        <Link href={href} className="forum-link">
                          Open thread
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
