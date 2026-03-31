"use client";
import ForumSidebar from "@/components/ForumSidebar";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import MarkdownContent from "@/components/MarkdownContent";
import PostTitleAndTags from "@/components/PostTitleAndTags";
import { getDisplayPostBody } from "@/lib/postTags";
import { supabase } from "@/lib/supabase";
import {
  getForumSubsectionHref,
  getSubsectionLabel,
  type ForumCategorySlug,
} from "@/lib/forum";
import {
  getLifeSectionSlug,
  parseTechnicalSkillSubsection,
} from "@/lib/skillTrees";
import type { Post } from "@/lib/postTypes";
import { POST_LIST_FIELDS } from "@/lib/postSelect";
import SequoiaBadge, { SequoiaBadgeForTier } from "@/components/SequoiaBadge";
import { formatBadgeThresholdLine, getEarnedSequoiaBadges } from "@/lib/sequoiaBadges";

// ── helpers ──────────────────────────────────────────────────

function dayKey(dateStr: string) {
  return dateStr.slice(0, 10);
}

function last30DayKeys(): string[] {
  const keys: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

function MiniBar({
  value,
  max,
  highlight,
}: {
  value: number;
  max: number;
  highlight?: boolean;
}) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div
      className="flex-1 rounded-sm"
      style={{
        background:
          value === 0
            ? "var(--forum-line-subtle)"
            : highlight
              ? "var(--forum-accent)"
              : "#93c5fd",
        opacity: value === 0 ? 0.4 : 1,
        minHeight: value === 0 ? 2 : undefined,
        maxHeight: "100%",
        alignSelf: "flex-end",
        transition: "background 0.1s",
        height: `${Math.max(pct, value > 0 ? 8 : 0)}%`,
      }}
      title={`${value} post${value === 1 ? "" : "s"}`}
    />
  );
}

function HorizontalBar({
  label,
  value,
  max,
  href,
}: {
  label: string;
  value: number;
  max: number;
  href?: string | null;
}) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  const inner = (
    <div className="flex items-center gap-3">
      <span
        className="min-w-[7rem] max-w-[10rem] truncate text-xs text-[var(--forum-text-secondary)]"
        title={label}
      >
        {label}
      </span>
      <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--forum-line-subtle)]">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[var(--forum-accent)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right text-xs font-semibold tabular-nums text-[var(--forum-text-primary)]">
        {value}
      </span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:opacity-80 transition-opacity">
        {inner}
      </Link>
    );
  }
  return inner;
}

export default function AccountPage() {
  const { user, loading, isGuest, displayName } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        .select(POST_LIST_FIELDS)
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
    return { helpful, notHelpful, points, totalPosts: posts.length };
  }, [posts]);

  const earnedBadges = useMemo(() => getEarnedSequoiaBadges(stats.points), [stats.points]);

  // ── activity heatmap ──────────────────────────────────────
  const dayKeys = useMemo(() => last30DayKeys(), []);

  const activityByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of posts) {
      const k = dayKey(p.created_at);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [posts]);

  const maxDayCount = useMemo(
    () => Math.max(1, ...dayKeys.map((k) => activityByDay.get(k) ?? 0)),
    [dayKeys, activityByDay],
  );

  const todayKey = new Date().toISOString().slice(0, 10);

  // ── posts by section ─────────────────────────────────────
  const postsBySection = useMemo(() => {
    const map = new Map<string, { label: string; count: number; href: string | null }>();
    for (const p of posts) {
      const cat = p.category as ForumCategorySlug | null;
      const sub = p.subcategory ?? null;
      if (!cat || !sub) continue;

      // normalise to section slug
      let sectionSlug = sub;
      if (cat === "life-advice") {
        sectionSlug = getLifeSectionSlug(sub) ?? sub;
      } else if (cat === "technical-advice") {
        sectionSlug = parseTechnicalSkillSubsection(sub)?.fieldSlug ?? sub;
      }

      const key = `${cat}::${sectionSlug}`;
      if (!map.has(key)) {
        map.set(key, {
          label: getSubsectionLabel(cat, sectionSlug),
          count: 0,
          href: getForumSubsectionHref(cat, sectionSlug),
        });
      }
      map.get(key)!.count += 1;
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 10);
  }, [posts]);

  const maxSectionCount = useMemo(
    () => Math.max(1, ...postsBySection.map((s) => s.count)),
    [postsBySection],
  );

  // ── vote breakdown ────────────────────────────────────────
  const voteRatio =
    stats.helpful + stats.notHelpful === 0
      ? null
      : Math.round((stats.helpful / (stats.helpful + stats.notHelpful)) * 100);

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
    <main className="forum-page forum-with-sidebar">
      <ForumSidebar />
      <div className="forum-main">
        <div className="forum-shell">

          {/* Header */}
          <header className="forum-card p-4 sm:p-5">
            <p className="forum-kicker">Account</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-[var(--forum-text-primary)]">
                {displayName}
              </h1>
              <SequoiaBadge points={stats.points} size="md" />
            </div>
            <p className="mt-1 text-sm text-[var(--forum-text-secondary)]">
              Sequoia points are earned when other users find your posts helpful. Points reflect your contribution across all joined sections.
              Badges unlock at 100, 500, and 1,000 lifetime points.
            </p>
          </header>

          {/* Stat tiles */}
          <section className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Sequoia points", value: stats.points, accent: stats.points > 0 },
              { label: "Helpful votes", value: stats.helpful },
              { label: "Not helpful", value: stats.notHelpful },
              { label: "Total posts", value: stats.totalPosts },
            ].map(({ label, value, accent }) => (
              <article
                key={label}
                className="forum-subsection-card p-3"
                style={
                  accent
                    ? { borderColor: "var(--forum-accent)", background: "#eef2ff" }
                    : undefined
                }
              >
                <p className="forum-section-label">{label}</p>
                <p
                  className="mt-1 text-2xl font-bold tabular-nums"
                  style={{ color: accent ? "var(--forum-accent-hover)" : undefined }}
                >
                  {value}
                </p>
              </article>
            ))}
          </section>

          {/* Earned badges */}
          <section className="forum-card mt-4 p-4 sm:p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--forum-text-muted)]">
              Recent badges earned
            </h2>
            {earnedBadges.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--forum-text-secondary)]">
                No badges yet. Your first unlocks at over 100 Sequoia points when others mark your posts as
                helpful.
              </p>
            ) : (
              <ul className="mt-3 space-y-0 divide-y divide-[var(--forum-border)]">
                {earnedBadges.map((tier) => (
                  <li key={tier.id} className="flex flex-wrap items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <SequoiaBadgeForTier tier={tier} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--forum-text-primary)]">{tier.label}</p>
                      <p className="mt-0.5 text-sm text-[var(--forum-text-muted)]">
                        {formatBadgeThresholdLine(tier)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Helpful ratio bar */}
          {voteRatio !== null && (
            <section className="forum-card mt-4 p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--forum-text-muted)]">
                Vote breakdown
              </h2>
              <div className="mt-3 flex items-center gap-3">
                <span className="w-10 text-right text-xs text-[var(--forum-text-secondary)]">
                  {voteRatio}%
                </span>
                <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-[#fecaca]">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-[#4ade80]"
                    style={{ width: `${voteRatio}%` }}
                  />
                </div>
                <div className="flex gap-3 text-xs text-[var(--forum-text-muted)]">
                  <span className="text-[#16a34a]">✓ {stats.helpful}</span>
                  <span className="text-[#dc2626]">✗ {stats.notHelpful}</span>
                </div>
              </div>
            </section>
          )}

          {/* 30-day activity */}
          <section className="forum-card mt-4 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--forum-text-muted)]">
              Posts — last 30 days
            </h2>
            <div
              className="mt-3 flex items-end gap-px overflow-hidden rounded"
              style={{ height: "5rem" }}
            >
              {dayKeys.map((k) => (
                <MiniBar
                  key={k}
                  value={activityByDay.get(k) ?? 0}
                  max={maxDayCount}
                  highlight={k === todayKey}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-xs text-[var(--forum-text-muted)]">
              <span>30 days ago</span>
              <span>Today</span>
            </div>
          </section>

          {/* Posts by section */}
          {postsBySection.length > 0 && (
            <section className="forum-card mt-4 p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--forum-text-muted)]">
                Activity by section
              </h2>
              <div className="mt-3 space-y-2.5">
                {postsBySection.map((s) => (
                  <HorizontalBar
                    key={s.label}
                    label={s.label}
                    value={s.count}
                    max={maxSectionCount}
                    href={s.href}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Recent posts */}
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
                  const cat =
                    post.category === "life-advice" || post.category === "technical-advice"
                      ? (post.category as ForumCategorySlug)
                      : null;
                  const sub = post.subcategory;
                  const label =
                    cat && sub ? getSubsectionLabel(cat, sub) : "General";
                  const postHref = `/forum/post/${post.id}`;

                  return (
                    <li key={post.id} className="forum-subsection-card p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-[var(--forum-text-muted)]">{label}</p>
                        <span className="text-xs text-[var(--forum-text-muted)]">
                          {new Date(post.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <PostTitleAndTags post={post} headingLevel={2} className="mt-1.5" />
                      <MarkdownContent
                        content={getDisplayPostBody(post)}
                        className="mt-1 line-clamp-2 text-sm text-[var(--forum-text-primary)]"
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--forum-text-muted)]">
                        <span className="text-[#16a34a]">+{post.helpful_count ?? 0} helpful</span>
                        <span className="text-[#dc2626]">-{post.not_helpful_count ?? 0} not helpful</span>
                        <Link href={postHref} className="forum-link ml-auto">
                          View thread →
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

        </div>
      </div>
    </main>
  );
}
