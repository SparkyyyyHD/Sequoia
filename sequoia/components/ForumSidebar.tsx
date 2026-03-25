"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FORUM_CATEGORIES } from "@/lib/forum";

export default function ForumSidebar() {
  const pathname = usePathname();

  return (
    <aside className="forum-sidebar">
      <div className="forum-sidebar-inner">
        <nav aria-label="Forum sections">
          <Link
            href="/forum"
            className="forum-sidebar-link"
            data-active={pathname === "/forum" ? "true" : undefined}
          >
            All
          </Link>
          <Link
            href="/skill-tree-v3"
            className="forum-sidebar-link"
            data-active={pathname === "/skill-tree-v3" ? "true" : undefined}
          >
            Skill Tree
          </Link>

          {/* Mobile: show category links inline */}
          {FORUM_CATEGORIES.map((category) => (
            <Link
              key={`mobile-${category.slug}`}
              href={`/forum/${category.slug}`}
              className="forum-sidebar-link forum-sidebar-link--mobile-only"
              data-active={pathname.startsWith(`/forum/${category.slug}`) ? "true" : undefined}
            >
              {category.label}
            </Link>
          ))}

          {/* Desktop: full tree */}
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
                  {category.subsections.map((sub) => {
                    const subHref = `/forum/${category.slug}/${sub.slug}`;
                    const isSubActive = pathname === subHref;

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
                </div>
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
