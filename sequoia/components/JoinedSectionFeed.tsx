"use client";

import { useEffect, useMemo, useState } from "react";
import PostForm from "@/components/PostForm";
import PostList from "@/components/PostList";
import JoinForumButton from "@/components/JoinForumButton";
import {
  getForumSectionKey,
  getJoinedForums,
  JOINED_FORUMS_CHANGE_EVENT,
} from "@/lib/joinedForums";
import type { Post } from "@/lib/postTypes";

export interface FeedNodeFilterOption {
  /** Post `subcategory` to match, or empty string for "all" */
  value: string;
  label: string;
}

interface JoinedSectionFeedProps {
  category: string;
  subcategory: string;
  posts: Post[];
  showSubsectionLink?: boolean;
  lockedTitle?: string;
  lockedMessage: string;
  feedNodeOptions?: FeedNodeFilterOption[];
}

export default function JoinedSectionFeed({
  category,
  subcategory,
  posts,
  showSubsectionLink,
  lockedTitle = "Join this section to participate",
  lockedMessage,
  feedNodeOptions,
}: JoinedSectionFeedProps) {
  const sectionKey = getForumSectionKey(category, subcategory);
  const [joined, setJoined] = useState<boolean | null>(null);
  const [nodeFilter, setNodeFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const showToolbar = Boolean(feedNodeOptions && feedNodeOptions.length > 1);

  const filteredPosts = useMemo(() => {
    if (!nodeFilter) return posts;
    return posts.filter((p) => p.subcategory === nodeFilter);
  }, [posts, nodeFilter]);

  const topicPickOptions = useMemo(
    () => feedNodeOptions?.filter((o) => o.value !== "") ?? [],
    [feedNodeOptions],
  );

  useEffect(() => {
    function syncJoinedState() {
      setJoined(getJoinedForums().has(sectionKey));
    }
    syncJoinedState();
    window.addEventListener(JOINED_FORUMS_CHANGE_EVENT, syncJoinedState);
    return () => window.removeEventListener(JOINED_FORUMS_CHANGE_EVENT, syncJoinedState);
  }, [sectionKey]);

  if (joined === null) {
    return (
      <div className="forum-card mt-4 p-4">
        <p className="text-sm text-[var(--forum-text-muted)]">Loading section...</p>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="forum-card mt-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--forum-text-primary)]">
              {lockedTitle}
            </h2>
            <p className="mt-1 text-sm text-[var(--forum-text-secondary)]">
              {lockedMessage}
            </p>
          </div>
          <JoinForumButton category={category} subsection={subcategory} />
        </div>
      </div>
    );
  }

  return (
    <>
      {showToolbar && (
        <div className="forum-feed-toolbar-wrap mt-4">
          <div className="forum-feed-toolbar">
            <span className="text-xs font-medium text-[var(--forum-text-muted)]">
              Filter by topic
            </span>
            <button
              type="button"
              className="forum-icon-btn ml-auto shrink-0"
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
              title={filtersOpen ? "Hide filters" : "Show topic filters"}
            >
              {filtersOpen ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
              {nodeFilter && !filtersOpen && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--forum-accent)] px-1 text-[10px] font-bold leading-none text-white">
                  1
                </span>
              )}
              <span className="sr-only">{filtersOpen ? "Close filters" : "Open filters"}</span>
            </button>
          </div>

          {filtersOpen && (
            <div className="forum-feed-toolbar-panel">
              {feedNodeOptions!.map((opt) => {
                const active = opt.value === "" ? nodeFilter === "" : nodeFilter === opt.value;
                return (
                  <button
                    key={opt.value || "__all__"}
                    type="button"
                    onClick={() => setNodeFilter(opt.value)}
                    className={`forum-topic-tag${active ? " forum-topic-tag--active" : ""}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
              {nodeFilter && (
                <button
                  type="button"
                  onClick={() => setNodeFilter("")}
                  className="forum-topic-tag ml-auto opacity-60 hover:opacity-100"
                >
                  ✕ Clear
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <PostForm
        key={subcategory}
        category={category}
        subcategory={subcategory}
        topicOptions={topicPickOptions.length > 1 ? topicPickOptions : undefined}
      />

      {filteredPosts.length === 0 && posts.length > 0 && (
        <p className="mt-3 text-sm text-[var(--forum-text-muted)]">
          No posts match your search or topic filter.
        </p>
      )}
      {filteredPosts.length === 0 && posts.length === 0 && (
        <p className="mt-3 text-sm text-[var(--forum-text-muted)]">No posts to show yet.</p>
      )}
      {filteredPosts.length > 0 && (
        <PostList posts={filteredPosts} showSubsectionLink={showSubsectionLink} />
      )}
    </>
  );
}
