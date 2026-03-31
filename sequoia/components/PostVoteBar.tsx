"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getOrCreateVoterKey } from "@/lib/voterKey";

type PostVoteBarProps = {
  postId: string;
  helpfulCount: number;
  notHelpfulCount: number;
  myVote: 1 | -1 | undefined;
  onMyVoteUpdate: (postId: string, vote: 1 | -1 | null) => void;
};

function applyVoteCountDelta(
  helpful: number,
  notHelpful: number,
  previousVote: 1 | -1 | null,
  nextVote: 1 | -1 | null
) {
  let nextHelpful = helpful;
  let nextNotHelpful = notHelpful;

  if (previousVote === 1) nextHelpful -= 1;
  if (previousVote === -1) nextNotHelpful -= 1;
  if (nextVote === 1) nextHelpful += 1;
  if (nextVote === -1) nextNotHelpful += 1;

  return {
    helpful: Math.max(0, nextHelpful),
    notHelpful: Math.max(0, nextNotHelpful),
  };
}

export default function PostVoteBar({
  postId,
  helpfulCount,
  notHelpfulCount,
  myVote,
  onMyVoteUpdate,
}: PostVoteBarProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayCounts, setDisplayCounts] = useState({
    helpful: helpfulCount ?? 0,
    notHelpful: notHelpfulCount ?? 0,
  });

  useEffect(() => {
    setDisplayCounts({
      helpful: helpfulCount ?? 0,
      notHelpful: notHelpfulCount ?? 0,
    });
  }, [helpfulCount, notHelpfulCount, postId]);

  async function applyVote(next: 1 | -1) {
    setError(null);
    const voterKey = getOrCreateVoterKey();
    if (!voterKey) {
      setError("Unable to save feedback in this browser.");
      return;
    }
    setPending(true);
    const { error: rpcError } = await supabase.rpc("set_post_vote", {
      p_post_id: postId,
      p_voter_key: voterKey,
      p_vote: myVote === next ? null : next,
    });
    setPending(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    const { data } = await supabase.rpc("get_my_votes_for_posts", {
      p_voter_key: voterKey,
      p_post_ids: [postId],
    });
    const row = (data as { post_id: string; vote: number }[] | null)?.[0];
    const nextVote = (row ? (row.vote as 1 | -1) : null) as 1 | -1 | null;

    setDisplayCounts((prev) =>
      applyVoteCountDelta(prev.helpful, prev.notHelpful, myVote ?? null, nextVote)
    );
    onMyVoteUpdate(postId, nextVote);
  }

  const h = displayCounts.helpful;
  const n = displayCounts.notHelpful;

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
