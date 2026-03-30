const GUEST_ACCOUNTS_KEY = "sequoia_guest_accounts";
const GUEST_SESSION_KEY = "sequoia_guest_session";
const GUEST_AVATAR_PREFIX = "sequoia_guest_avatar_";

type GuestAccounts = Record<string, { passwordHash: string }>;

async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function loadAccounts(): GuestAccounts {
  try {
    return JSON.parse(localStorage.getItem(GUEST_ACCOUNTS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function getGuestSession(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(GUEST_SESSION_KEY);
}

export async function createGuestAccount(
  username: string,
  password: string
): Promise<{ error: string | null }> {
  const accounts = loadAccounts();

  if (accounts[username]) {
    return { error: "That username is already taken on this device." };
  }

  const passwordHash = await hashPassword(password);
  accounts[username] = { passwordHash };
  localStorage.setItem(GUEST_ACCOUNTS_KEY, JSON.stringify(accounts));
  localStorage.setItem(GUEST_SESSION_KEY, username);
  return { error: null };
}

export async function signInGuest(
  username: string,
  password: string
): Promise<{ error: string | null }> {
  const accounts = loadAccounts();
  const account = accounts[username];

  if (!account) {
    return { error: "No guest account found with that username." };
  }

  const passwordHash = await hashPassword(password);
  if (passwordHash !== account.passwordHash) {
    return { error: "Incorrect password." };
  }

  localStorage.setItem(GUEST_SESSION_KEY, username);
  return { error: null };
}

export function signOutGuest(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GUEST_SESSION_KEY);
}

export function getGuestAvatarUrl(username: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(GUEST_AVATAR_PREFIX + username);
}

export function setGuestAvatarUrl(username: string, url: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GUEST_AVATAR_PREFIX + username, url);
}
