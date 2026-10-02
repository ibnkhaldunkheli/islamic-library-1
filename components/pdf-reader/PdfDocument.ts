import { getOfflineBlob } from '@/lib/offlineStore';

let workerConfigured = false;

export type PdfDocumentProxy = {
  numPages: number;
  getPage: (page: number) => Promise<PdfPageProxy>;
  destroy: () => Promise<void> | void;
};

export type PdfPageProxy = {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  render: (options: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number }; transform?: number[] }) => { promise: Promise<void>; cancel?: () => void };
  getTextContent: () => Promise<{ items?: Array<{ str?: string }> }>;
};

export async function loadPdfDocument(url: string, bookId?: string): Promise<PdfDocumentProxy> {
  const pdfjs = await import('pdfjs-dist');
  if (!workerConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    workerConfigured = true;
  }
  const offline = bookId ? await getOfflineBlob('book', bookId) : null;
  const task = offline ? pdfjs.getDocument({ data: await offline.arrayBuffer() }) : pdfjs.getDocument({ url, disableAutoFetch: false, disableStream: false });
  return task.promise as unknown as Promise<PdfDocumentProxy>;
}
