"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

type Mode = "signin" | "signup" | "forgot" | "guest";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, isGuest, signInAsGuest } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [guestNew, setGuestNew] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [guestPassword, setGuestPassword] = useState("");
  const [guestConfirmPassword, setGuestConfirmPassword] = useState("");

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (user || isGuest)) {
      router.replace("/forum");
    }
  }, [user, loading, isGuest, router]);

  function resetForm() {
    setEmail("");
    setPassword("");
    setDisplayName("");
    setConfirmPassword("");
    setUsername("");
    setGuestPassword("");
    setGuestConfirmPassword("");
    setError(null);
    setSuccess(null);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setGuestNew(false);
    resetForm();
  }

  async function handleGuestSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!username.trim()) {
      setError("Please enter a username.");
      return;
    }
    if (guestNew) {
      if (guestPassword.length < 4) {
        setError("Password must be at least 4 characters.");
        return;
      }
      if (guestPassword !== guestConfirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    } else {
      if (!guestPassword) {
        setError("Please enter your password.");
        return;
      }
    }

    setPending(true);
    const { error: guestError } = await signInAsGuest(
      username.trim(),
      guestPassword,
      guestNew
    );
    setPending(false);

    if (guestError) {
      setError(guestError);
    } else {
      router.replace("/forum");
    }
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

    if (mode === "forgot") {
      if (!email.trim()) {
        setError("Please enter your email address.");
        return;
      }

      setPending(true);

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (resetError) {
        setError(resetError.message);
        setPending(false);
        return;
      }

      setSuccess(
        "If an account exists for this email, a password reset link has been sent."
      );
      setPending(false);
      return;
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
          <button
            type="button"
            className={`auth-tab${mode === "guest" ? " auth-tab--active" : ""}`}
            onClick={() => switchMode("guest")}
          >
            Guest
          </button>
        </div>

        {mode === "guest" ? (
          <form onSubmit={handleGuestSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="guest-username" className="auth-label">
                Username
              </label>
              <input
                id="guest-username"
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="forum-input"
                autoComplete="username"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="guest-password" className="auth-label">
                Password
              </label>
              <input
                id="guest-password"
                type="password"
                placeholder={guestNew ? "At least 4 characters" : "Your guest password"}
                value={guestPassword}
                onChange={(e) => setGuestPassword(e.target.value)}
                required
                className="forum-input"
                autoComplete={guestNew ? "new-password" : "current-password"}
              />
            </div>

            {guestNew && (
              <div className="auth-field">
                <label htmlFor="guest-confirm-password" className="auth-label">
                  Confirm password
                </label>
                <input
                  id="guest-confirm-password"
                  type="password"
                  placeholder="Repeat your password"
                  value={guestConfirmPassword}
                  onChange={(e) => setGuestConfirmPassword(e.target.value)}
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
                : guestNew
                ? "Create guest account"
                : "Sign in as guest"}
            </button>

            <button
              type="button"
              className="forum-link w-fit"
              onClick={() => {
                setGuestNew((v) => !v);
                setGuestPassword("");
                setGuestConfirmPassword("");
                setError(null);
                setSuccess(null);
              }}
            >
              {guestNew
                ? "Already have a guest account? Sign in"
                : "New here? Create a guest account"}
            </button>
          </form>
        ) : (
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

            {mode !== "forgot" && (
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
            )}

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

            {mode === "signin" && (
              <button
                type="button"
                className="forum-link w-fit"
                onClick={() => {
                  setMode("forgot");
                  setPassword("");
                  setConfirmPassword("");
                  setError(null);
                  setSuccess(null);
                }}
              >
                Forgot my password
              </button>
            )}

            {mode === "forgot" && (
              <p className="text-xs text-[var(--forum-text-muted)] m-0">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>
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
                : mode === "forgot"
                ? "Send reset link"
                : mode === "signin"
                ? "Sign in"
                : "Create account"}
            </button>

            {mode === "forgot" && (
              <button
                type="button"
                className="forum-link w-fit"
                onClick={() => switchMode("signin")}
              >
                Back to sign in
              </button>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
