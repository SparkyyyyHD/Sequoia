"use client";

import { useEffect, useState } from "react";
import {
  forumKey,
  getJoinedForums,
  toggleJoinedForum,
  JOINED_FORUMS_CHANGE_EVENT,
} from "@/lib/joinedForums";


interface JoinForumButtonProps {
  category: string;
  subsection: string;
  disabled?: boolean;
}


export default function JoinForumButton({
  category,
  subsection,
}: JoinForumButtonProps) {
  // Technical join only for a specific skill node (field__skill). Life: any non-empty skill slug.
  if (
    (category === "technical-advice" && !subsection.includes("__")) ||
    (category === "life-advice" && !subsection)
  ) {
    return null;
  }

  const key = forumKey(category, subsection);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    setJoined(getJoinedForums().has(key));

    function onJoinedChange() {
      setJoined(getJoinedForums().has(key));
    }

    window.addEventListener(JOINED_FORUMS_CHANGE_EVENT, onJoinedChange);
    return () => window.removeEventListener(JOINED_FORUMS_CHANGE_EVENT, onJoinedChange);
  }, [key]);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = toggleJoinedForum(key);
    setJoined(next.has(key));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`forum-join-btn${joined ? " forum-join-btn--active" : ""}`}
      aria-label={joined ? "Leave forum" : "Join forum"}
      title={joined ? "Leave forum" : "Join forum"}
    >
      {joined ? "Joined" : "Join"}
    </button>
  );
}
