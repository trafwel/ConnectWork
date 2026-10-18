/**
 * M9 — Photo / PDF → upload payload · done
 *
 * WHAT THIS ACHIEVES
 *   Phone photos are 3–12 MB. Shrinking them to ≤ 1600 px JPEG before upload
 *   makes extraction several times faster and keeps us far under request
 *   limits, with no loss in what Gemini can read on a business card or roster.
 *
 * HOW IT FITS
 *   SnapDialog → fileToPayload(file) → { mimeType, dataBase64 } → aiPost('/extract').
 *
 * STEPS
 *   1. PDFs: if file.type === 'application/pdf', check size ≤ 7 MB (else throw a
 *      friendly Error) and return { mimeType: 'application/pdf', dataBase64 }.
 *      (M9 review: the scaffold said 8 MB, but base64 adds a third — 8 MB becomes ~10.7 MB,
 *      over the server's 10 MB body limit. 7 MB → ~9.3 MB fits.)
 *   2. Images: createImageBitmap(file); scale = min(1, 1600 / max(width, height));
 *      draw onto a canvas of the scaled size; canvas.toBlob(cb, 'image/jpeg', 0.85).
 *   3. blobToBase64: FileReader.readAsDataURL → strip the "data:…;base64," prefix.
 *   4. Return { mimeType: 'image/jpeg', dataBase64 }.
 *      Re-drawing through a canvas also DROPS the photo's metadata (EXIF), including GPS
 *      location, so where the photo was taken never leaves the browser.
 *
 * DONE WHEN
 *   - A 4000 px phone photo becomes a ~200–400 KB JPEG payload.
 *
 * Guide: §16.1
 */
import type { ExtractRequest } from '@connectwork/shared';

/** base64 is 4/3 the size; 7 MB → ~9.3 MB, which fits the server's 10 MB request limit. */
export const MAX_PDF_BYTES = 7 * 1024 * 1024;
/** Longest side after downscaling: plenty for a card or a roster, ~200–400 KB as JPEG. */
export const MAX_SIDE = 1600;

/** Scale factor so the longest side is at most `max` (never upscales). */
export function scaleFor(width: number, height: number, max = MAX_SIDE): number {
  return Math.min(1, max / Math.max(width, height, 1));
}

/** A plain-words error for a PDF that is too big, or null when it's fine. */
export function pdfSizeError(bytes: number): string | null {
  return bytes > MAX_PDF_BYTES ? `That PDF is ${(bytes / 1024 / 1024).toFixed(1)} MB. The limit is 7 MB: try a shorter file or a photo of the page.` : null;
}

// Step 3
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''));
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.readAsDataURL(blob);
  });
}

export async function fileToPayload(file: File): Promise<ExtractRequest['file']> {
  // Step 1. PDFs go as they are (they can't be downscaled here).
  if (file.type === 'application/pdf') {
    const tooBig = pdfSizeError(file.size);
    if (tooBig) throw new Error(tooBig);
    return { mimeType: 'application/pdf', dataBase64: await blobToBase64(file) };
  }
  if (!file.type.startsWith('image/')) throw new Error('Choose a photo (JPEG, PNG, WebP) or a PDF');

  // Step 2. Decode → downscale → re-encode as JPEG (this also strips EXIF, incl. GPS).
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // e.g. iPhone HEIC photos in Chrome: the browser can't decode them.
    throw new Error("This browser can't read that image type. Try a JPEG or PNG (on iPhone: Settings → Camera → Formats → Most Compatible).");
  }
  const scale = scaleFor(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process that image');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const jpeg = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process that image'))), 'image/jpeg', 0.85),
  );
  // Step 4
  return { mimeType: 'image/jpeg', dataBase64: await blobToBase64(jpeg) };
}
