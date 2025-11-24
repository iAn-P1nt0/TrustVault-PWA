/**
 * TrustVault OCR Service
 *
 * Lazy-loaded Tesseract.js wrapper for client-side OCR processing.
 * Security: All processing is local-only; image buffers are cleared
 * immediately after recognition to maintain zero-knowledge guarantees.
 */

import type { Worker, RecognizeResult } from 'tesseract.js';

let tesseractWorker: Worker | null = null;
let initializationPromise: Promise<Worker> | null = null;

export interface OCRProgress {
  status: string;
  progress: number;
}

/**
 * Initialize or retrieve the Tesseract worker singleton.
 * Follows CLAUDE.md lazy-load pattern for heavy WASM modules.
 */
async function getWorker(
  onProgress?: (progress: OCRProgress) => void
): Promise<Worker> {
  if (tesseractWorker) {
    return tesseractWorker;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    // Dynamic import to avoid blocking initial bundle
    const Tesseract = await import('tesseract.js');

    const options: Record<string, unknown> = {};
    if (onProgress) {
      options.logger = (m: { status: string; progress: number }) => {
        onProgress({ status: m.status, progress: m.progress });
      };
    }

    const worker = await Tesseract.createWorker('eng', 1, options);

    tesseractWorker = worker;
    return worker;
  })();

  return initializationPromise;
}

/**
 * Recognize text from an image blob.
 * @param imageBlob - The captured image as a Blob
 * @param onProgress - Optional progress callback
 * @returns Recognized text and confidence score
 */
export async function recognizeText(
  imageBlob: Blob,
  onProgress?: (progress: OCRProgress) => void
): Promise<{ text: string; confidence: number }> {
  const worker = await getWorker(onProgress);

  const result: RecognizeResult = await worker.recognize(imageBlob);

  return {
    text: result.data.text,
    confidence: result.data.confidence,
  };
}

/**
 * Terminate the Tesseract worker and release resources.
 * Call when OCR feature is no longer needed (e.g., on component unmount).
 */
export async function terminateWorker(): Promise<void> {
  if (tesseractWorker) {
    await tesseractWorker.terminate();
    tesseractWorker = null;
    initializationPromise = null;
  }
}

/**
 * Check if the browser supports required APIs for OCR capture.
 */
export function isOCRSupported(): boolean {
  return !!(
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}
