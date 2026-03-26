import { supabase } from "@/lib/supabase";
import { isImageUrl, isVideoUrl } from "@/lib/markdown";

const ATTACHMENTS_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_ATTACHMENTS_BUCKET ?? "attachments";

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function buildAttachmentMarkdown(url: string, fileName: string): string {
  if (isImageUrl(url)) return `![${fileName}](${url})`;
  if (isVideoUrl(url)) return `[Video: ${fileName}](${url})`;
  return `[Attachment: ${fileName}](${url})`;
}

export async function uploadAttachments(
  files: File[],
  scope: "posts" | "comments"
): Promise<string[]> {
  const urls: string[] = [];

  for (const file of files) {
    const safeName = sanitizeFileName(file.name || "attachment");
    const path = `${scope}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`;

    const { error } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage.from(ATTACHMENTS_BUCKET).getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return urls;
}
