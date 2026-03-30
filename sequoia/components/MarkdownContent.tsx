import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import {
  getVideoEmbedUrl,
  isDirectVideoUrl,
  isVideoUrl,
} from "@/lib/markdown";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export default function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        rehypePlugins={[rehypeRaw]}
        components={{
          p: ({ children }) => <p className="markdown-p">{children}</p>,
          a: ({ href, children }) => {
            const target = href ?? "";
            if (isVideoUrl(target)) {
              const embedUrl = getVideoEmbedUrl(target);
              if (embedUrl) {
                return (
                  <div className="markdown-video-wrapper">
                    <iframe
                      src={embedUrl}
                      title="Embedded video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                );
              }

              if (isDirectVideoUrl(target)) {
                return (
                  <video className="markdown-video" controls preload="metadata">
                    <source src={target} />
                    Your browser does not support the video tag.
                  </video>
                );
              }
            }

            return (
              <a href={href} target="_blank" rel="noreferrer" className="forum-link">
                {children}
              </a>
            );
          },
          img: ({ src, alt }) =>
            src ? (
              <img
                src={src}
                alt={alt ?? "Embedded image"}
                className="markdown-image"
                loading="lazy"
              />
            ) : null,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
