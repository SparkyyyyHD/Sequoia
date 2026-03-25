"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  getGuestSession,
  createGuestAccount,
  signInGuest,
  signOutGuest,
} from "@/lib/guestAuth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  displayName: string | null;
  isGuest: boolean;
  signOut: () => Promise<void>;
  signInAsGuest: (
    username: string,
    password: string,
    isNew: boolean
  ) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  displayName: null,
  isGuest: false,
  signOut: async () => {},
  signInAsGuest: async () => ({ error: null }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestUsername, setGuestUsername] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setGuestUsername(getGuestSession());
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setGuestUsername(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    signOutGuest();
    setGuestUsername(null);
  };

  const signInAsGuest = useCallback(
    async (username: string, password: string, isNew: boolean) => {
      const result = isNew
        ? await createGuestAccount(username, password)
        : await signInGuest(username, password);

      if (!result.error) {
        setGuestUsername(username);
      }
      return result;
    },
    []
  );

  const isGuest = !user && guestUsername !== null;

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ??
    user?.email ??
    guestUsername ??
    null;

  return (
    <AuthContext.Provider
      value={{ user, loading, displayName, isGuest, signOut, signInAsGuest }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
