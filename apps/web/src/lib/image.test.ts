import { describe, expect, it } from 'vitest';
import { MAX_PDF_BYTES, pdfSizeError, scaleFor } from './image';

describe('image payload rules', () => {
  it('scales the longest side to 1600 px and never upscales', () => {
    expect(scaleFor(4032, 3024)).toBeCloseTo(1600 / 4032);
    expect(scaleFor(3024, 4032)).toBeCloseTo(1600 / 4032);
    expect(scaleFor(800, 600)).toBe(1);
  });

  it('caps PDFs so the base64 request fits the server limit of 10 MB', () => {
    expect((MAX_PDF_BYTES * 4) / 3).toBeLessThan(10 * 1024 * 1024);
    expect(pdfSizeError(MAX_PDF_BYTES)).toBeNull();
    expect(pdfSizeError(MAX_PDF_BYTES + 1)).toMatch(/limit is 7 MB/);
  });
});
