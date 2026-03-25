"use client";

import { useEffect, useState } from "react";
import { getFavorites, toggleFavorite, subsectionKey, FAVORITES_CHANGE_EVENT } from "@/lib/favorites";

interface FavoriteButtonProps {
  category: string;
  subsection: string;
}

export default function FavoriteButton({ category, subsection }: FavoriteButtonProps) {
  const key = subsectionKey(category, subsection);
  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    setFavorited(getFavorites().has(key));

    function onFavoritesChange() {
      setFavorited(getFavorites().has(key));
    }
    window.addEventListener(FAVORITES_CHANGE_EVENT, onFavoritesChange);
    return () => window.removeEventListener(FAVORITES_CHANGE_EVENT, onFavoritesChange);
  }, [key]);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = toggleFavorite(key);
    setFavorited(next.has(key));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`forum-favorite-btn${favorited ? " forum-favorite-btn--active" : ""}`}
      aria-label={favorited ? "Remove from favorites" : "Save to favorites"}
      title={favorited ? "Remove from favorites" : "Save to favorites"}
    >
      {favorited ? "★" : "☆"}
    </button>
  );
}
