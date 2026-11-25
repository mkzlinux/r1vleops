/** Client file attachments (logos, images, briefs): validation shared by the order form and storage. */

export const MAX_FILES = 10;
export const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "webp", "gif", "svg", "heic", "pdf", "ai", "eps", "psd", "fig", "zip", "txt", "doc", "docx", "ppt", "pptx",
]);

export interface FileLike {
  readonly name: string;
  readonly size: number;
  readonly type: string;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

/** Returns human-readable problems; empty when every file is acceptable. */
export function validateFiles(files: readonly FileLike[]): string[] {
  if (files.length > MAX_FILES) return [`You can attach at most ${MAX_FILES} files.`];
  return files.flatMap((file) => {
    if (!ALLOWED_EXTENSIONS.has(extensionOf(file.name))) return [`${file.name}: file type not supported.`];
    if (file.size > MAX_FILE_BYTES) return [`${file.name}: too large (max ${MAX_FILE_BYTES / 1024 / 1024} MB).`];
    if (file.size === 0) return [`${file.name}: file is empty.`];
    return [];
  });
}

/** Storage key for an attachment, safe to use as a path (no traversal, no odd characters). */
export function attachmentKey(orderId: string, index: number, name: string): string {
  const safe = name.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/\.{2,}/g, "").replace(/^-+/, "").slice(0, 80) || "file";
  return `${orderId}/${index}-${safe}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
