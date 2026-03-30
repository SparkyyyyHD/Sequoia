"use client";

import { useEffect, useRef, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import AuthorAvatar from "@/components/AuthorAvatar";
import { buildAttachmentMarkdown, uploadAttachments } from "@/lib/attachments";
import { convertContentForSubmit } from "@/lib/markdown";
import {
  getPostTitleFromContent,
  MAX_TAGS,
  normalizeSingleTag,
} from "@/lib/postTags";

export interface PostTopicOption {
  value: string;
  label: string;
}

interface PostFormProps {
  category: string;
  subcategory: string;
  /** Hub + skill tags; when set, user picks which subcategory to store on the post */
  topicOptions?: PostTopicOption[];
}

// Serialize contenteditable DOM → markdown string
function serializeEditor(el: HTMLDivElement): string {
  function nodeToMd(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent ?? "";
    }
    const elem = node as Element;
    if (elem.tagName === "BR") return "";
    if (elem.tagName === "IMG") {
      const img = elem as HTMLImageElement;
      const src = img.dataset.markdownSrc || img.src;
      const alt = img.alt || "image";
      return `![${alt}](${src})`;
    }
    const inner = Array.from(node.childNodes).map(nodeToMd).join("");
    if (elem.tagName === "DIV" || elem.tagName === "P") {
      return inner + "\n";
    }
    return inner;
  }

  const raw = Array.from(el.childNodes).map(nodeToMd).join("");
  // Trim trailing newline only
  return raw.replace(/\n$/, "");
}

export default function PostForm({ category, subcategory, topicOptions }: PostFormProps) {
  const router = useRouter();
  const { user, displayName, loading, isGuest } = useAuth();
  const editorRef = useRef<HTMLDivElement>(null);
  const [editorEmpty, setEditorEmpty] = useState(true);
  const [content, setContent] = useState("");
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [tagInputOpen, setTagInputOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const tagInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [postSubcategory, setPostSubcategory] = useState(subcategory);

  const canSubmit = Boolean(content.trim()) || attachments.length > 0;

  useEffect(() => {
    if (tagInputOpen) tagInputRef.current?.focus();
  }, [tagInputOpen]);

  const syncContent = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;

    // Ensure the first child is always a block element so CSS > :first-child
    // applies the title style reliably (Chrome doesn't wrap until first Enter).
    if (el.firstChild?.nodeType === Node.TEXT_NODE) {
      const wrapper = document.createElement("div");
      const sel = window.getSelection();
      let anchorOffset = sel?.anchorOffset ?? 0;
      while (el.firstChild?.nodeType === Node.TEXT_NODE) {
        wrapper.appendChild(el.firstChild);
      }
      el.insertBefore(wrapper, el.firstChild ?? null);
      // Restore caret inside the wrapper
      try {
        const range = document.createRange();
        const textNode = wrapper.firstChild;
        if (textNode) {
          anchorOffset = Math.min(anchorOffset, textNode.textContent?.length ?? 0);
          range.setStart(textNode, anchorOffset);
          range.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      } catch {
        // caret restoration is best-effort
      }
    }

    const text = serializeEditor(el);
    setContent(text);
    setEditorEmpty(text.trim() === "" && !el.querySelector("img"));
  }, []);

  if (loading) return null;

  if (!user && !isGuest) {
    return (
      <div className="forum-card mt-4 p-4 text-sm text-[var(--forum-text-secondary)]">
        <Link href="/login" className="forum-link font-semibold">
          Sign in
        </Link>{" "}
        or{" "}
        <Link href="/login" className="forum-link font-semibold">
          post as a guest
        </Link>{" "}
        to leave a post.
      </div>
    );
  }

  function commitTag() {
    const t = normalizeSingleTag(tagDraft);
    setTagDraft("");
    setTagInputOpen(false);
    if (!t) return;
    if (customTags.length >= MAX_TAGS) return;
    if (customTags.some((x) => x.toLowerCase() === t.toLowerCase())) return;
    setCustomTags((prev) => [...prev, t]);
  }

  function removeTag(tag: string) {
    setCustomTags((prev) => prev.filter((x) => x !== tag));
  }

  async function insertImageFile(file: File) {
    if (!editorRef.current) return;
    setIsUploadingAttachments(true);
    setError(null);
    try {
      const urls = await uploadAttachments([file], "posts");
      const url = urls[0];

      const img = document.createElement("img");
      img.src = url;
      img.alt = file.name.replace(/\.[^.]+$/, "");
      img.dataset.markdownSrc = url;
      img.className = "forum-composer-image";

      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (editorRef.current.contains(range.commonAncestorContainer)) {
          range.deleteContents();
          range.insertNode(img);
          range.setStartAfter(img);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          editorRef.current.appendChild(img);
        }
      } else {
        editorRef.current.appendChild(img);
      }

      syncContent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload image.");
    } finally {
      setIsUploadingAttachments(false);
    }
  }

  async function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const items = Array.from(e.clipboardData?.items ?? []);

    // Image in clipboard → upload and insert inline
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) await insertImageFile(file);
        return;
      }
    }

    // Force plain-text paste to strip rich HTML from copy-paste
    const text = e.clipboardData?.getData("text/plain");
    if (text !== undefined) {
      e.preventDefault();
      document.execCommand("insertText", false, text);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const finalContent = convertContentForSubmit(content);
    if (!finalContent && attachments.length === 0) return;

    let attachmentMarkdown = "";
    if (attachments.length > 0) {
      setIsUploadingAttachments(true);
      try {
        const urls = await uploadAttachments(attachments, "posts");
        attachmentMarkdown = urls
          .map((url, idx) => buildAttachmentMarkdown(url, attachments[idx].name))
          .join("\n");
      } catch (uploadError) {
        const message =
          uploadError instanceof Error
            ? uploadError.message
            : "Could not upload attachments.";
        setError(message);
        setIsUploadingAttachments(false);
        return;
      }
      setIsUploadingAttachments(false);
    }

    const combinedContent = [finalContent, attachmentMarkdown]
      .filter(Boolean)
      .join("\n\n")
      .trim();

    const derivedTitle = getPostTitleFromContent(combinedContent);

    const { error: insertError } = await supabase.from("posts").insert({
      category,
      subcategory: postSubcategory,
      content: combinedContent,
      author_name: displayName,
      title: derivedTitle || null,
      custom_tags: customTags,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    // Reset form
    setContent("");
    setEditorEmpty(true);
    if (editorRef.current) editorRef.current.innerHTML = "";
    setCustomTags([]);
    setTagInputOpen(false);
    setTagDraft("");
    setAttachments([]);
    setFileInputKey((k) => k + 1);
    startTransition(() => {
      router.refresh();
    });
  }

  function handleAttachmentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;
    setAttachments((prev) => [...prev, ...selected]);
  }

  return (
    <form onSubmit={handleSubmit} className="forum-post-composer forum-card mt-4 p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <AuthorAvatar name={displayName} size="md" />
        <p className="text-sm font-semibold text-[var(--forum-text-primary)]">{displayName}</p>
      </div>
      {topicOptions && topicOptions.length > 1 && (
        <label className="mb-3 flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--forum-text-muted)]">Topic tag</span>
          <select
            value={postSubcategory}
            onChange={(e) => setPostSubcategory(e.target.value)}
            className="forum-input text-sm"
          >
            {topicOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={syncContent}
        onPaste={handlePaste}
        data-placeholder={"Title…\n\nBody…"}
        className={`forum-composer-editor forum-input mb-3${editorEmpty ? " is-empty" : ""}`}
        role="textbox"
        aria-multiline="true"
        aria-label="Post content"
      />

      <div className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          {customTags.map((t) => (
            <span
              key={t}
              className="forum-post-custom-tag inline-flex items-center gap-0.5 pr-0.5"
            >
              {t}
              <button
                type="button"
                className="forum-tag-remove-btn"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => removeTag(t)}
                aria-label={`Remove tag ${t}`}
              >
                ×
              </button>
            </span>
          ))}
          {customTags.length < MAX_TAGS &&
            (tagInputOpen ? (
              <input
                ref={tagInputRef}
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitTag();
                  }
                  if (e.key === "Escape") {
                    setTagDraft("");
                    setTagInputOpen(false);
                  }
                }}
                onBlur={() => commitTag()}
                className="forum-input h-8 min-w-[9rem] rounded-full py-0 text-sm"
                placeholder="New tag"
                maxLength={40}
                aria-label="New tag name"
              />
            ) : (
              <button
                type="button"
                className="forum-tag-add-btn"
                onClick={() => setTagInputOpen(true)}
                aria-label="Add tag"
                title="Add tag"
              >
                +
              </button>
            ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id={`post-attachments-${fileInputKey}`}
          key={fileInputKey}
          type="file"
          multiple
          onChange={handleAttachmentChange}
          className="hidden"
        />
        <label
          htmlFor={`post-attachments-${fileInputKey}`}
          className="inline-flex cursor-pointer items-center gap-2 rounded border border-[var(--forum-border)] bg-[var(--forum-bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--forum-text-secondary)] hover:bg-[var(--forum-hover)]"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21.44 11.05l-8.49 8.49a5.5 5.5 0 0 1-7.78-7.78l9.19-9.19a3.5 3.5 0 1 1 4.95 4.95l-9.2 9.19a1.5 1.5 0 0 1-2.12-2.12l8.48-8.48" />
          </svg>
          Attach files
        </label>
      </div>
      {attachments.length > 0 && (
        <div className="mt-3 rounded-md border border-[var(--forum-border)] bg-[var(--forum-bg-secondary)] p-3">
          <p className="mb-2 text-sm font-medium text-[var(--forum-text-secondary)]">
            Attached files ({attachments.length})
          </p>
          <ul className="space-y-2">
            {attachments.map((file, idx) => (
              <li
                key={`${file.name}-${idx}`}
                className="flex items-center justify-between rounded border border-[var(--forum-border)] bg-[var(--forum-bg)] px-3 py-2"
              >
                <span className="truncate pr-3 text-sm text-[var(--forum-text-primary)]">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  className="cursor-pointer rounded border border-[var(--forum-border)] px-2 py-1 text-xs font-medium text-[var(--forum-text-secondary)] hover:bg-[var(--forum-hover)]"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-[var(--forum-error)]">{error}</p>}
      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={isPending || isUploadingAttachments || !canSubmit}
          className="forum-button disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploadingAttachments
            ? "Uploading…"
            : isPending
              ? "Submitting…"
              : "Post"}
        </button>
      </div>
    </form>
  );
}
