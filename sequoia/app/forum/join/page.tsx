import Link from "next/link";

export default function ForumJoinHubPage() {
  return (
    <>
      <header className="forum-card p-4 sm:p-5">
        <p className="forum-kicker">Forum</p>
        <h1 className="mt-0.5 text-lg font-semibold text-[var(--forum-text-primary)]">
          Join sections
        </h1>
        <p className="mt-1 text-sm text-[var(--forum-text-secondary)]">
          Choose a category—each page lists only that kind of section, with live activity and what you unlock.
        </p>
      </header>

      <div className="forum-join-hub mt-4">
        <Link
          href="/forum/join/life-advice"
          className="forum-join-hub-card text-[var(--forum-text-secondary)]"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--forum-text-muted)]">
            Life advice
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--forum-text-primary)]">
            Relationships, health, money, career, and more
          </p>
          <p className="mt-1 text-xs">
            Skill arcs, section feeds, and join cards with post activity →
          </p>
        </Link>
        <Link
          href="/forum/join/technical-advice"
          className="forum-join-hub-card text-[var(--forum-text-secondary)]"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--forum-text-muted)]">
            Technical advice
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--forum-text-primary)]">
            Fishing, trades, automotive, cooking, and more
          </p>
          <p className="mt-1 text-xs">
            Whole-field joins, skill trees, and field-level stats →
          </p>
        </Link>
      </div>
    </>
  );
}
