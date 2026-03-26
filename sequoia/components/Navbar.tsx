"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function Navbar() {
  const router = useRouter();
  const { user, displayName, isGuest, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
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

        <div className="navbar-auth">
          {user || isGuest ? (
            <>
              <Link href="/account" className="navbar-account-link">
                Dashboard
              </Link>
              <span className="navbar-user">
                {displayName}
                {isGuest && (
                  <span className="text-[var(--forum-text-muted)] text-xs ml-1">
                    (guest)
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="navbar-signout"
              >
                Sign out
              </button>
            </>
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
