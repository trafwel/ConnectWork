/**
 * M9 — Image preparation for snap to add · Owner: Person B · ~20 min
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
 *   1. PDFs: if file.type === 'application/pdf', check size ≤ 8 MB (else throw a
 *      friendly Error) and return { mimeType: 'application/pdf', dataBase64 }.
 *   2. Images: createImageBitmap(file); scale = min(1, 1600 / max(width, height));
 *      draw onto a canvas of the scaled size; canvas.toBlob(cb, 'image/jpeg', 0.85).
 *   3. blobToBase64: FileReader.readAsDataURL → strip the "data:…;base64," prefix.
 *   4. Return { mimeType: 'image/jpeg', dataBase64 }.
 *
 * DONE WHEN
 *   - A 4000 px phone photo becomes a ~200–400 KB JPEG payload.
 *
 * Guide: §16.1
 */
import type { ExtractRequest } from '@connectwork/shared';

export async function fileToPayload(_file: File): Promise<ExtractRequest['file']> {
  // TODO(M9) steps 1–4
  throw new Error('TODO(M9): fileToPayload is not implemented yet');
}
