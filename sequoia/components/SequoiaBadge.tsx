import { getBadgeForPoints, type SequoiaBadgeTier } from "@/lib/sequoiaBadges";

interface SequoiaBadgeProps {
  points: number | null | undefined;
  /** Larger text on dashboard vs inline on posts. */
  size?: "sm" | "md";
  className?: string;
}

export default function SequoiaBadge({ points, size = "sm", className = "" }: SequoiaBadgeProps) {
  const badge = getBadgeForPoints(points ?? 0);
  if (!badge) return null;

  const sizeClass =
    size === "md"
      ? "px-2.5 py-1 text-xs font-semibold"
      : "px-1.5 py-0.5 text-[0.65rem] font-semibold leading-tight";

  return (
    <span
      className={`forum-sequoia-badge inline-flex shrink-0 items-center rounded-full border ${badge.accentClass} ${sizeClass} ${className}`.trim()}
      title={`${badge.label} — ${badge.minPoints}+ lifetime Sequoia points`}
    >
      <span className="mr-0.5 opacity-90" aria-hidden>
        🌲
      </span>
      {badge.shortLabel}
    </span>
  );
}

/** Renders a specific tier (e.g. dashboard list of all earned badges). */
export function SequoiaBadgeForTier({
  tier,
  size = "sm",
  className = "",
}: {
  tier: SequoiaBadgeTier;
  size?: "sm" | "md";
  className?: string;
}) {
  const sizeClass =
    size === "md"
      ? "px-2.5 py-1 text-xs font-semibold"
      : "px-1.5 py-0.5 text-[0.65rem] font-semibold leading-tight";

  return (
    <span
      className={`forum-sequoia-badge inline-flex shrink-0 items-center rounded-full border ${tier.accentClass} ${sizeClass} ${className}`.trim()}
      title={`${tier.label} — ${tier.minPoints}+ lifetime Sequoia points`}
    >
      <span className="mr-0.5 opacity-90" aria-hidden>
        🌲
      </span>
      {tier.shortLabel}
    </span>
  );
}
