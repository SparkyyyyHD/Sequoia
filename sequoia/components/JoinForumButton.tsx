"use client";

import { useEffect, useState } from "react";
import {
  getJoinedForums,
  getForumSectionKey,
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
  const key = subsection ? getForumSectionKey(category, subsection) : "";
  const [joined, setJoined] = useState(() =>
    subsection ? getJoinedForums().has(key) : false
  );

  useEffect(() => {
    if (!subsection) return;

    function onJoinedChange() {
      setJoined(getJoinedForums().has(key));
    }

    window.addEventListener(JOINED_FORUMS_CHANGE_EVENT, onJoinedChange);
    return () => window.removeEventListener(JOINED_FORUMS_CHANGE_EVENT, onJoinedChange);
  }, [key, subsection]);

  if (!subsection) {
    return null;
  }

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
