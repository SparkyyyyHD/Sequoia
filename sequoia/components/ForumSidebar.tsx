"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FORUM_CATEGORIES } from "@/lib/forum";
import {
  LIFE_SKILL_PILLARS,
  getLifeSectionSlug,
} from "@/lib/skillTrees";
import {
  getForumSectionKey,
  getJoinedForums,
  JOINED_FORUMS_CHANGE_EVENT,
} from "@/lib/joinedForums";

export default function ForumSidebar() {
  const pathname = usePathname();
  const [joinedForums, setJoinedForums] = useState<Set<string>>(new Set());

  useEffect(() => {
    setJoinedForums(getJoinedForums());

    function onJoinedChange() {
      setJoinedForums(getJoinedForums());
    }

    window.addEventListener(JOINED_FORUMS_CHANGE_EVENT, onJoinedChange);
    return () => window.removeEventListener(JOINED_FORUMS_CHANGE_EVENT, onJoinedChange);
  }, []);

  const activeLifeSkillSlug = pathname.startsWith("/forum/life-advice/")
    ? pathname.slice("/forum/life-advice/".length).split("/")[0]
    : null;
  const activeLifeSectionSlug = activeLifeSkillSlug
    ? getLifeSectionSlug(activeLifeSkillSlug)
    : null;
  const joinedLifePillars = useMemo(
    () =>
      LIFE_SKILL_PILLARS.filter((pillar) =>
        joinedForums.has(getForumSectionKey("life-advice", pillar.slug))
      ),
    [joinedForums]
  );
  const joinedTechnicalSections = useMemo(() => {
    const technicalCategory = FORUM_CATEGORIES.find(
      (category) => category.slug === "technical-advice"
    );
    return (technicalCategory?.subsections ?? []).filter((subsection) =>
      joinedForums.has(getForumSectionKey("technical-advice", subsection.slug))
    );
  }, [joinedForums]);

  return (
    <aside className="forum-sidebar">
      <div className="forum-sidebar-inner">
        <nav aria-label="Forum sections">
          <Link
            href="/forum"
            className="forum-sidebar-link"
            data-active={pathname === "/forum" ? "true" : undefined}
          >
            Home
          </Link>
          <Link
            href="/skill-tree"
            className="forum-sidebar-link"
            data-active={pathname === "/skill-tree" ? "true" : undefined}
          >
            Skill Tree
          </Link>
          <Link
            href="/account"
            className="forum-sidebar-link"
            data-active={pathname === "/account" ? "true" : undefined}
          >
            Dashboard
          </Link>

          {/* Mobile: category link + join for each section */}
          {FORUM_CATEGORIES.map((category) => (
            <div key={`mobile-${category.slug}`} className="forum-sidebar-mobile-section">
              <Link
                href={`/forum/${category.slug}`}
                className="forum-sidebar-link"
                data-active={pathname.startsWith(`/forum/${category.slug}`) ? "true" : undefined}
              >
                {category.label}
              </Link>
              <Link
                href={
                  category.slug === "life-advice"
                    ? "/forum/join/life-advice"
                    : "/forum/join/technical-advice"
                }
                className="forum-sidebar-join-btn forum-sidebar-join-btn--under-section"
                data-active={
                  category.slug === "life-advice"
                    ? pathname.startsWith("/forum/join/life-advice")
                      ? "true"
                      : undefined
                    : pathname.startsWith("/forum/join/technical-advice")
                      ? "true"
                      : undefined
                }
                aria-label={
                  category.slug === "life-advice"
                    ? "Join more life advice sections"
                    : "Join more technical sections"
                }
                title={
                  category.slug === "life-advice"
                    ? "Join more life advice sections"
                    : "Join more technical sections"
                }
              >
                +
              </Link>
            </div>
          ))}

          {/* Desktop: full tree — Life + Technical always visible; subsections are joined only */}
          {FORUM_CATEGORIES.map((category) => {
            const categoryHref = `/forum/${category.slug}`;
            const isCategoryActive = pathname === categoryHref;

            return (
              <div key={category.slug} className="forum-sidebar-group">
                <Link
                  href={categoryHref}
                  className="forum-sidebar-heading"
                  data-active={isCategoryActive ? "true" : undefined}
                >
                  {category.label}
                </Link>
                <div className="forum-sidebar-subsections">
                  {category.slug === "life-advice"
                    ? joinedLifePillars.map((pillar) => {
                        const subHref = `/forum/life-advice/${pillar.slug}`;
                        const isSubActive = activeLifeSectionSlug === pillar.slug;

                        return (
                          <Link
                            key={pillar.slug}
                            href={subHref}
                            className="forum-sidebar-sublink"
                            data-active={isSubActive ? "true" : undefined}
                          >
                            {pillar.label}
                          </Link>
                        );
                      })
                    : joinedTechnicalSections.map((sub) => {
                        const subHref = `/forum/${category.slug}/${sub.slug}`;
                        const isSubActive =
                          pathname === subHref || pathname.startsWith(`${subHref}/`);

                        return (
                          <Link
                            key={sub.slug}
                            href={subHref}
                            className="forum-sidebar-sublink"
                            data-active={isSubActive ? "true" : undefined}
                          >
                            {sub.label}
                          </Link>
                        );
                      })}
                  <Link
                    href={
                      category.slug === "life-advice"
                        ? "/forum/join/life-advice"
                        : "/forum/join/technical-advice"
                    }
                    className="forum-sidebar-join-btn forum-sidebar-join-btn--under-section"
                    data-active={
                      category.slug === "life-advice"
                        ? pathname.startsWith("/forum/join/life-advice")
                          ? "true"
                          : undefined
                        : pathname.startsWith("/forum/join/technical-advice")
                          ? "true"
                          : undefined
                    }
                    aria-label={
                      category.slug === "life-advice"
                        ? "Join more life advice sections"
                        : "Join more technical sections"
                    }
                    title={
                      category.slug === "life-advice"
                        ? "Join more life advice sections"
                        : "Join more technical sections"
                    }
                  >
                    +
                  </Link>
                </div>
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
