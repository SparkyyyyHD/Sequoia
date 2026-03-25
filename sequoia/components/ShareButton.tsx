"use client";

import { useState } from "react";

export default function ShareButton({ postId }: { postId: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    const url = `${window.location.origin}${window.location.pathname}#post-${postId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // fallback for browsers that block clipboard without interaction
      const el = document.createElement("input");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" onClick={handleClick} className="post-action-btn">
      {copied ? "Copied!" : "Share"}
    </button>
  );
}
