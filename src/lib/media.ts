/**
 * Shared media type definitions for gallery uploads (images + videos).
 * SVG is intentionally excluded everywhere: inline-served SVG can carry
 * <script> (stored XSS on the origin), and the deny-by-default upload
 * route now rejects .svg entirely rather than forcing a download.
 */

export const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
]);

export const ALLOWED_MEDIA = new Set<string>([...IMAGE_TYPES, ...VIDEO_TYPES]);

const EXT_FOR_MIME = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
  ["video/quicktime", "mov"],
  ["video/x-matroska", "mkv"],
]);

export function extForMime(mime: string): string {
  return EXT_FOR_MIME.get(mime) ?? mime.split("/")[1];
}

export function isVideoMime(mime: string): boolean {
  return VIDEO_TYPES.has(mime);
}

/** Content types served from /api/uploads — extend as needed. */
export const UPLOAD_SERVE_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
};
