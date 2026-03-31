"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { getOrCreateVoterKey } from "@/lib/voterKey";

type PostVoteBarProps = {
  postId: string;
  helpfulCount: number;
  notHelpfulCount: number;
  myVote: 1 | -1 | undefined;
  onMyVoteUpdate: (postId: string, vote: 1 | -1 | null) => void;
};

export default function PostVoteBar({
  postId,
  helpfulCount,
  notHelpfulCount,
  myVote,
  onMyVoteUpdate,
}: PostVoteBarProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countDelta, setCountDelta] = useState({ helpful: 0, notHelpful: 0 });

  async function applyVote(next: 1 | -1) {
    setError(null);
    const voterKey = getOrCreateVoterKey();
    if (!voterKey) {
      setError("Unable to save feedback in this browser.");
      return;
    }

    const toggling = myVote === next;
    const newVote = toggling ? null : next;
    const prevVote: 1 | -1 | null = myVote ?? null;

    const delta = { helpful: 0, notHelpful: 0 };
    if (toggling) {
      if (next === 1) delta.helpful = -1;
      else delta.notHelpful = -1;
    } else {
      if (next === 1) {
        delta.helpful = 1;
        if (myVote === -1) delta.notHelpful = -1;
      } else {
        delta.notHelpful = 1;
        if (myVote === 1) delta.helpful = -1;
      }
    }

    setCountDelta((prev) => ({
      helpful: prev.helpful + delta.helpful,
      notHelpful: prev.notHelpful + delta.notHelpful,
    }));
    onMyVoteUpdate(postId, newVote as 1 | -1 | null);

    setPending(true);
    const { error: rpcError } = await supabase.rpc("set_post_vote", {
      p_post_id: postId,
      p_voter_key: voterKey,
      p_vote: newVote,
    });
    setPending(false);

    if (rpcError) {
      setCountDelta((prev) => ({
        helpful: prev.helpful - delta.helpful,
        notHelpful: prev.notHelpful - delta.notHelpful,
      }));
      onMyVoteUpdate(postId, prevVote);
      setError(rpcError.message);
      return;
    }
  }

  const h = (helpfulCount ?? 0) + countDelta.helpful;
  const n = (notHelpfulCount ?? 0) + countDelta.notHelpful;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-[var(--forum-line-subtle)] pt-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => applyVote(1)}
        className={`inline-flex items-center gap-1 rounded-[3px] border px-2 py-0.5 text-xs font-medium disabled:opacity-50 ${
          myVote === 1
            ? "border-[#93c5fd] bg-[#eef2ff] text-[var(--forum-accent-hover)]"
            : "border-[var(--forum-border)] bg-white text-[var(--forum-text-secondary)] hover:bg-[var(--forum-line-subtle)]"
        }`}
      >
        Helpful <span className="font-normal tabular-nums">{h}</span>
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => applyVote(-1)}
        className={`inline-flex items-center gap-1 rounded-[3px] border px-2 py-0.5 text-xs font-medium disabled:opacity-50 ${
          myVote === -1
            ? "border-[#93c5fd] bg-[#eef2ff] text-[var(--forum-accent-hover)]"
            : "border-[var(--forum-border)] bg-white text-[var(--forum-text-secondary)] hover:bg-[var(--forum-line-subtle)]"
        }`}
      >
        Not helpful <span className="font-normal tabular-nums">{n}</span>
      </button>
      {error && <span className="text-xs text-[var(--forum-error)]">{error}</span>}
    </div>
  );
}
