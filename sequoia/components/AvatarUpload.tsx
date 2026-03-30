"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import AuthorAvatar from "@/components/AuthorAvatar";

const MAX_SIZE_MB = 2;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

function CameraIcon() {
  return (
    <svg
      className="h-5 w-5 text-white"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <rect x="2" y="7" width="20" height="15" rx="2" />
      <path d="M16.5 7l-1.5-3H9L7.5 7" />
      <circle cx="12" cy="14.5" r="3.5" />
    </svg>
  );
}

export default function AvatarUpload() {
  const { user, displayName, avatarUrl } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  async function handleFile(file: File) {
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPEG, PNG, GIF, or WebP images are allowed.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_SIZE_MB} MB.`);
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user!.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: urlData.publicUrl },
      });
      if (updateError) throw updateError;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="group relative block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--forum-accent)] focus-visible:ring-offset-2 disabled:cursor-wait"
        title="Change profile picture"
        aria-label="Change profile picture"
      >
        <AuthorAvatar name={displayName} src={avatarUrl} size="lg" />
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          {uploading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <CameraIcon />
          )}
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
      {error && (
        <p className="max-w-[12rem] text-center text-xs text-[var(--forum-error)]">{error}</p>
      )}
    </div>
  );
}
