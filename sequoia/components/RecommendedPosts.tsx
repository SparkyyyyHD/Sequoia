"use client";

import { useEffect, useMemo, useState } from "react";
import { getFavorites, subsectionKey, FAVORITES_CHANGE_EVENT } from "@/lib/favorites";
import PostList from "@/components/PostList";
import type { Post } from "@/lib/postTypes";

/**
 * Scoring formula (higher = ranked first):
 *   score = (net_votes × 2) + age_bonus + favorite_bonus
 *
 *   net_votes    = helpful_count − not_helpful_count
 *   age_bonus    = < 7 days → +4 | < 30 days → +2 | < 90 days → +1 | else 0
 *   fav_bonus    = post is in a favorited subsection → +6
 */
function scorePost(post: Post, favorites: Set<string>): number {
  const net = (post.helpful_count ?? 0) - (post.not_helpful_count ?? 0);

  const ageDays = (Date.now() - new Date(post.created_at).getTime()) / 86_400_000;
  const ageBonus = ageDays < 7 ? 4 : ageDays < 30 ? 2 : ageDays < 90 ? 1 : 0;

  const key = subsectionKey(post.category ?? "", post.subcategory ?? "");
  const favBonus = favorites.has(key) ? 6 : 0;

  return net * 2 + ageBonus + favBonus;
}

interface RecommendedPostsProps {
  candidates: Post[];
  limit?: number;
}

export default function RecommendedPosts({ candidates, limit = 8 }: RecommendedPostsProps) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    setFavorites(getFavorites());

    function onFavoritesChange() {
      setFavorites(getFavorites());
    }
    window.addEventListener(FAVORITES_CHANGE_EVENT, onFavoritesChange);
    return () => window.removeEventListener(FAVORITES_CHANGE_EVENT, onFavoritesChange);
  }, []);

  const ranked = useMemo(
    () =>
      [...candidates]
        .sort((a, b) => scorePost(b, favorites) - scorePost(a, favorites))
        .slice(0, limit),
    [candidates, favorites, limit]
  );

  return <PostList posts={ranked} showSubsectionLink />;
}
