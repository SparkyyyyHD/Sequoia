"use client";

import { useEffect, useMemo, useState } from "react";
import { getFavorites, subsectionKey } from "@/lib/favorites";
import { getForumSectionKey, getJoinedForums } from "@/lib/joinedForums";
import PostList from "@/components/PostList";
import type { Post } from "@/lib/postTypes";

/**
 * Builds a stable, semi-random ordering for the current page load.
 * Favorited sections and newer posts get better odds, while vote counts
 * only nudge the odds instead of fully controlling the ranking.
 */
function recommendationWeight(post: Post, favorites: Set<string>): number {
  const net = (post.helpful_count ?? 0) - (post.not_helpful_count ?? 0);
  const ageDays = (Date.now() - new Date(post.created_at).getTime()) / 86_400_000;
  const ageBoost = ageDays < 7 ? 1.4 : ageDays < 30 ? 0.8 : ageDays < 90 ? 0.35 : 0;
  const key = subsectionKey(post.category ?? "", post.subcategory ?? "");
  const favoriteBoost = favorites.has(key) ? 1.75 : 0;
  const voteBoost = Math.max(0, Math.min(net, 12)) * 0.08;

  return 1 + ageBoost + favoriteBoost + voteBoost;
}

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildRecommendations(
  candidates: Post[],
  favorites: Set<string>,
  limit: number,
  seed: number,
): string[] {
  const random = mulberry32(seed);

  return [...candidates]
    .map((post, index) => {
      const weight = recommendationWeight(post, favorites);
      const draw = Math.max(random(), 1e-9);

      return {
        post,
        index,
        priority: Math.pow(draw, 1 / weight),
      };
    })
    .sort((a, b) => b.priority - a.priority || a.index - b.index)
    .slice(0, limit)
    .map(({ post }) => post.id);
}

interface RecommendedPostsProps {
  candidates: Post[];
  limit?: number;
  seed: string;
}

export default function RecommendedPosts({ candidates, limit = 8, seed }: RecommendedPostsProps) {
  const [joinedForums, setJoinedForums] = useState<Set<string>>(new Set());

  useEffect(() => {
    setJoinedForums(getJoinedForums());
  }, []);

  const visibleCandidates = useMemo(
    () =>
      candidates.filter((post) => {
        if (!post.category || !post.subcategory) return false;
        return joinedForums.has(getForumSectionKey(post.category, post.subcategory));
      }),
    [candidates, joinedForums]
  );

  const ranked = useMemo(() => {
    if (visibleCandidates.length === 0) return [];
    const ids = buildRecommendations(
      visibleCandidates,
      getFavorites(),
      limit,
      hashSeed(`${seed}:${visibleCandidates.map((post) => post.id).join(",")}`),
    );
    const postsById = new Map(visibleCandidates.map((post) => [post.id, post]));
    return ids.map((id) => postsById.get(id)).filter((post): post is Post => Boolean(post));
  }, [visibleCandidates, limit, seed]);

  if (visibleCandidates.length === 0) {
    return (
      <p className="forum-card p-4 text-sm text-[var(--forum-text-muted)]">
        Join a life or technical section to see posts in your forum feed.
      </p>
    );
  }

  return <PostList posts={ranked} showSubsectionLink />;
}
