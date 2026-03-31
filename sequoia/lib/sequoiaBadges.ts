/**
 * Sequoia points = sum of (helpful_count − not_helpful_count) across a user's posts.
 * Badges reward lifetime contribution thresholds.
 */

export interface SequoiaBadgeTier {
  id: "contributor" | "voice" | "legend";
  /** Minimum points required (inclusive). */
  minPoints: number;
  /** Short label for inline UI. */
  shortLabel: string;
  /** Full name for tooltips and dashboard. */
  label: string;
  /** Accent for styling. */
  accentClass: string;
}

/** Highest tier first — getBadgeForPoints picks the first match. */
export const SEQUOIA_BADGE_TIERS: SequoiaBadgeTier[] = [
  {
    id: "legend",
    minPoints: 1000,
    shortLabel: "Legend",
    label: "Sequoia legend",
    accentClass: "forum-sequoia-badge--legend",
  },
  {
    id: "voice",
    minPoints: 500,
    shortLabel: "Voice",
    label: "Sequoia voice",
    accentClass: "forum-sequoia-badge--voice",
  },
  {
    id: "contributor",
    minPoints: 100,
    shortLabel: "Contributor",
    label: "Sequoia contributor",
    accentClass: "forum-sequoia-badge--contributor",
  },
];

export function getBadgeForPoints(points: number): SequoiaBadgeTier | null {
  if (!Number.isFinite(points) || points < 100) return null;
  for (const tier of SEQUOIA_BADGE_TIERS) {
    if (points >= tier.minPoints) return tier;
  }
  return null;
}

/** All tiers the user has met, lowest threshold first (progression order). */
export function getEarnedSequoiaBadges(points: number): SequoiaBadgeTier[] {
  if (!Number.isFinite(points) || points < 100) return [];
  const ascending = [...SEQUOIA_BADGE_TIERS].sort((a, b) => a.minPoints - b.minPoints);
  return ascending.filter((t) => points >= t.minPoints);
}

/** Dashboard copy, e.g. "Over 100 points". */
export function formatBadgeThresholdLine(tier: SequoiaBadgeTier): string {
  return `Over ${tier.minPoints.toLocaleString()} points`;
}

export function sequoiaPointsFromPostRow(helpful: number | null | undefined, notHelpful: number | null | undefined): number {
  return (helpful ?? 0) - (notHelpful ?? 0);
}
