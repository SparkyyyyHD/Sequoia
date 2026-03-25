const STORAGE_KEY = "sequoia_voter_key";

export function getOrCreateVoterKey(): string {
  if (typeof window === "undefined") return "";
  try {
    let key = localStorage.getItem(STORAGE_KEY);
    if (!key || key.length < 12) {
      key = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, key);
    }
    return key;
  } catch {
    return "";
  }
}
