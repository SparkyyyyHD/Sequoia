"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import AuthorAvatar from "@/components/AuthorAvatar";
import { supabase } from "@/lib/supabase";
import { upsertAvatarUrl } from "@/lib/profiles";

const MAX_SIZE_MB = 2;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export default function Navbar() {
  const router = useRouter();
  const { user, displayName, isGuest, avatarUrl, signOut, setAvatarUrl } = useAuth();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setUploadError(null);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [menuOpen]);

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/forum/search?q=${encodeURIComponent(q)}`);
  }

  async function handleFile(file: File) {
    setUploadError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("Only JPEG, PNG, GIF, or WebP allowed.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploadError(`Image must be under ${MAX_SIZE_MB} MB.`);
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const folder = user ? user.id : `guest-${displayName}`;
      const path = `${folder}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);

      if (user) {
        const { error: metaErr } = await supabase.auth.updateUser({
          data: { avatar_url: urlData.publicUrl },
        });
        if (metaErr) throw metaErr;
      }

      // Update the UI immediately and persist to profiles so existing posts
      // pick up the new photo on next render.
      setAvatarUrl(urlData.publicUrl);
      if (displayName) {
        void upsertAvatarUrl(displayName, urlData.publicUrl);
      }
      setMenuOpen(false);
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link href="/forum" className="navbar-brand">
          <Image
            src="/logo.png"
            alt="Sequoia logo"
            width={28}
            height={28}
            className="navbar-logo"
            priority
          />
          <span className="navbar-title">Sequoia</span>
        </Link>

        <form onSubmit={handleSearch} className="navbar-search" role="search">
          <svg
            className="navbar-search-icon"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <label className="sr-only" htmlFor="navbar-search-input">
            Search forum
          </label>
          <input
            id="navbar-search-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="navbar-search-input"
            autoComplete="off"
          />
        </form>

        <div className="navbar-auth">
          {user || isGuest ? (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen((o) => !o);
                  setUploadError(null);
                }}
                className="block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--forum-accent)] focus-visible:ring-offset-2"
                aria-label="Account menu"
                aria-expanded={menuOpen}
                aria-haspopup="true"
              >
                <AuthorAvatar
                  name={displayName}
                  src={avatarUrl}
                  size="sm"
                />
              </button>

              {menuOpen && (
                <div className="navbar-dropdown" role="menu">
                  <div className="navbar-dropdown-name">
                    {displayName}
                    {isGuest && (
                      <span className="ml-1 text-xs text-[var(--forum-text-muted)]">
                        (guest)
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="navbar-dropdown-item"
                  >
                    {uploading ? (
                      <span className="flex items-center gap-1.5">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Uploading…
                      </span>
                    ) : (
                      "Change photo"
                    )}
                  </button>

                  {uploadError && (
                    <p className="navbar-dropdown-error">{uploadError}</p>
                  )}

                  <Link
                    href="/account"
                    role="menuitem"
                    className="navbar-dropdown-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    Dashboard
                  </Link>

                  <div className="navbar-dropdown-divider" />

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    className="navbar-dropdown-item navbar-dropdown-item--danger"
                  >
                    Sign out
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_TYPES.join(",")}
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                  e.target.value = "";
                }}
              />
            </div>
          ) : (
            <Link href="/login" className="navbar-signin">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
