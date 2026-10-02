import type { PdfPageProxy } from './PdfDocument';

export class PdfPageCache {
  private readonly pages = new Map<number, PdfPageProxy>();
  constructor(private readonly limit = 10) {}

  get(page: number) {
    const value = this.pages.get(page);
    if (!value) return undefined;
    this.pages.delete(page); this.pages.set(page, value);
    return value;
  }

  set(page: number, value: PdfPageProxy) {
    this.pages.delete(page); this.pages.set(page, value);
    while (this.pages.size > this.limit) this.pages.delete(this.pages.keys().next().value as number);
  }

  clear() { this.pages.clear(); }
}
