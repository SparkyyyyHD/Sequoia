"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  getGuestSession,
  createGuestAccount,
  signInGuest,
  signOutGuest,
  getGuestAvatarUrl,
  setGuestAvatarUrl,
} from "@/lib/guestAuth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  isGuest: boolean;
  signOut: () => Promise<void>;
  signInAsGuest: (
    username: string,
    password: string,
    isNew: boolean
  ) => Promise<{ error: string | null }>;
  /** Call after a successful avatar upload to update the UI immediately. */
  setAvatarUrl: (url: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  displayName: null,
  avatarUrl: null,
  isGuest: false,
  signOut: async () => {},
  signInAsGuest: async () => ({ error: null }),
  setAvatarUrl: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestUsername, setGuestUsername] = useState<string | null>(null);
  const [guestAvatarUrl, setGuestAvatarUrlState] = useState<string | null>(null);
  // Immediate override so the navbar updates the instant upload finishes,
  // without waiting for onAuthStateChange to propagate new user metadata.
  const [avatarUrlOverride, setAvatarUrlOverride] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        const username = getGuestSession();
        setGuestUsername(username);
        if (username) {
          setGuestAvatarUrlState(getGuestAvatarUrl(username));
        }
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setGuestUsername(null);
        setGuestAvatarUrlState(null);
        // Once auth state propagates the new metadata, drop the override so
        // the canonical value takes over.
        setAvatarUrlOverride(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    signOutGuest();
    setGuestUsername(null);
    setGuestAvatarUrlState(null);
    setAvatarUrlOverride(null);
  };

  const signInAsGuest = useCallback(
    async (username: string, password: string, isNew: boolean) => {
      const result = isNew
        ? await createGuestAccount(username, password)
        : await signInGuest(username, password);

      if (!result.error) {
        setGuestUsername(username);
        setGuestAvatarUrlState(getGuestAvatarUrl(username));
      }
      return result;
    },
    []
  );

  const setAvatarUrl = useCallback(
    (url: string) => {
      setAvatarUrlOverride(url);
      if (guestUsername) {
        setGuestAvatarUrl(guestUsername, url);
        setGuestAvatarUrlState(url);
      }
    },
    [guestUsername]
  );

  const isGuest = !user && guestUsername !== null;

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ??
    user?.email ??
    guestUsername ??
    null;

  // Override wins immediately after upload; falls back to auth metadata or
  // persisted guest URL once the override is cleared.
  const avatarUrl =
    avatarUrlOverride ||
    (user?.user_metadata?.avatar_url as string | undefined) ||
    guestAvatarUrl ||
    null;

  return (
    <AuthContext.Provider
      value={{ user, loading, displayName, avatarUrl, isGuest, signOut, signInAsGuest, setAvatarUrl }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
