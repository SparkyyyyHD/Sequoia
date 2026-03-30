"use client";

import { useMemo, useState } from "react";

function hueFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function initialsFromName(name: string | null | undefined): string {
  const t = name?.trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  if (t.length >= 2) return t.slice(0, 2).toUpperCase();
  return t[0]!.toUpperCase();
}

const SIZE_CLASSES = {
  sm: "h-8 w-8 text-[0.65rem]",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
} as const;

interface AuthorAvatarProps {
  name: string | null | undefined;
  src?: string | null;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

export default function AuthorAvatar({
  name,
  src,
  size = "md",
  className = "",
}: AuthorAvatarProps) {
  const initials = useMemo(() => initialsFromName(name), [name]);
  const anonymous = !name?.trim();
  const [imgFailed, setImgFailed] = useState(false);

  const style = useMemo(() => {
    if (anonymous) {
      return {
        background: "var(--forum-line-subtle)",
        color: "var(--forum-text-muted)",
      } as const;
    }
    const hue = hueFromString(name!.trim()) % 360;
    return {
      background: `hsl(${hue} 46% 90%)`,
      color: `hsl(${hue} 45% 28%)`,
    } as const;
  }, [name, anonymous]);

  if (src && !imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ?? "avatar"}
        onError={() => setImgFailed(true)}
        className={`shrink-0 rounded-full object-cover ${SIZE_CLASSES[size]} ${className}`}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold leading-none ${SIZE_CLASSES[size]} ${className}`}
      style={style}
      aria-hidden
    >
      {initials}
    </div>
  );
}
