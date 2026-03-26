export function isLikelyUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "http:" ||
      url.protocol === "https:" ||
      url.protocol === "blob:"
    );
  } catch {
    return false;
  }
}

export interface PendingClipboardImage {
  dataUrl: string;
  sourceUrl?: string;
}

export function isImageUrl(value: string): boolean {
  if (!isLikelyUrl(value)) return false;
  if (value.startsWith("blob:")) return true;
  return /\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i.test(value);
}

export function isDirectVideoUrl(value: string): boolean {
  if (!isLikelyUrl(value)) return false;
  return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(value);
}

export function isEmbeddableVideoUrl(value: string): boolean {
  if (!isLikelyUrl(value)) return false;
  return /(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|vimeo\.com\/)/i.test(value);
}

export function isVideoUrl(value: string): boolean {
  return isDirectVideoUrl(value) || isEmbeddableVideoUrl(value);
}

export function getVideoEmbedUrl(value: string): string | null {
  if (!isLikelyUrl(value)) return null;

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();

    if (host.includes("youtu.be")) {
      const id = url.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (host.includes("youtube.com")) {
      if (url.pathname.startsWith("/watch")) {
        const id = url.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (url.pathname.startsWith("/shorts/")) {
        const id = url.pathname.split("/")[2];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
    }

    if (host.includes("vimeo.com")) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }

  return null;
}

function wrapUrlAsMarkdown(url: string): string {
  if (isImageUrl(url)) return `![Image](${url})`;
  if (isVideoUrl(url)) return `[Video](${url})`;
  return `[${url}](${url})`;
}

export function convertPastedTextToMarkdown(text: string): string {
  const urlRegex = /(https?:\/\/[^\s<>\")\]]+|blob:[^\s<>\")\]]+)/gi;

  return text.replace(urlRegex, (match) => {
    if (!isLikelyUrl(match)) return match;
    return wrapUrlAsMarkdown(match);
  });
}

export function convertContentForSubmit(
  text: string,
  pendingImages: PendingClipboardImage[] = []
): string {
  let converted = convertPastedTextToMarkdown(text);

  if (pendingImages.length === 0) {
    return converted.trim();
  }

  const used = new Set<number>();

  pendingImages.forEach((img, idx) => {
    if (!img.sourceUrl) return;
    if (!converted.includes(img.sourceUrl)) return;
    converted = converted.split(img.sourceUrl).join(img.dataUrl);
    used.add(idx);
  });

  const appendImages = pendingImages
    .map((img, idx) => ({ img, idx }))
    .filter(({ idx }) => !used.has(idx))
    .map(({ img }, i) => `![Pasted image ${i + 1}](${img.dataUrl})`)
    .join("\n\n");

  if (!appendImages) {
    return converted.trim();
  }

  return `${converted.trim()}\n\n${appendImages}`.trim();
}
