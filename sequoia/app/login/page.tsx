"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/forum");
    }
  }, [user, loading, router]);

  function resetForm() {
    setEmail("");
    setPassword("");
    setDisplayName("");
    setConfirmPassword("");
    setError(null);
    setSuccess(null);
  }

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    resetForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === "signup") {
      if (!displayName.trim()) {
        setError("Please enter a display name.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
    }

    setPending(true);

    if (mode === "signin") {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        setError(authError.message);
        setPending(false);
        return;
      }
      router.replace("/forum");
    } else {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName.trim() },
        },
      });
      if (authError) {
        setError(authError.message);
        setPending(false);
        return;
      }
      setSuccess(
        "Account created! Check your email to confirm your address, then sign in."
      );
      setMode("signin");
      setEmail(email);
      setPassword("");
    }

    setPending(false);
  }

  if (loading) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <p className="text-sm text-[var(--forum-text-muted)]">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab${mode === "signin" ? " auth-tab--active" : ""}`}
            onClick={() => switchMode("signin")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`auth-tab${mode === "signup" ? " auth-tab--active" : ""}`}
            onClick={() => switchMode("signup")}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "signup" && (
            <div className="auth-field">
              <label htmlFor="display-name" className="auth-label">
                Display name
              </label>
              <input
                id="display-name"
                type="text"
                placeholder="How others will see you"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="forum-input"
                autoComplete="name"
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="email" className="auth-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="forum-input"
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password" className="auth-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder={mode === "signup" ? "At least 6 characters" : ""}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="forum-input"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </div>

          {mode === "signup" && (
            <div className="auth-field">
              <label htmlFor="confirm-password" className="auth-label">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="forum-input"
                autoComplete="new-password"
              />
            </div>
          )}

          {error && <p className="auth-error">{error}</p>}
          {success && <p className="auth-success">{success}</p>}

          <button
            type="submit"
            disabled={pending}
            className="forum-button auth-submit disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending
              ? "Please wait..."
              : mode === "signin"
              ? "Sign in"
              : "Create account"}
          </button>
        </form>
      </div>
    </main>
  );
}
