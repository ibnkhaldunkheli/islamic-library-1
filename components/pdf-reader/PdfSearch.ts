import type { PdfDocumentProxy, PdfPageProxy } from './PdfDocument';

export type PdfSearchResult = { page: number; count: number };
const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase().replace(/[\u064B-\u065F\u0670]/g, '');

export async function searchPdf(document: PdfDocumentProxy, query: string, getPage: (page: number) => Promise<PdfPageProxy>, onProgress?: (page: number) => void) {
  const needle = normalize(query.trim());
  if (!needle) return [];
  const results: PdfSearchResult[] = [];
  for (let page = 1; page <= document.numPages; page += 1) {
    const content = await (await getPage(page)).getTextContent();
    const text = (content.items ?? []).map((item) => item.str ?? '').join(' ');
    const count = normalize(text).split(needle).length - 1;
    if (count > 0) results.push({ page, count });
    onProgress?.(page);
    if (page % 6 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return results;
}
