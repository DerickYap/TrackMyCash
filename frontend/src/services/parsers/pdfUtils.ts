import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href;

export interface TextRow {
  items: Array<{ x: number; text: string }>;
  joined: string;
}

async function getRows(pdf: pdfjsLib.PDFDocumentProxy, maxPages?: number): Promise<TextRow[]> {
  const allRows: TextRow[] = [];
  const pageCount = maxPages ? Math.min(maxPages, pdf.numPages) : pdf.numPages;

  for (let p = 1; p <= pageCount; p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();

    const items: Array<{ x: number; y: number; text: string }> = [];
    for (const raw of content.items) {
      if (!('str' in raw) || !raw.str.trim()) continue;
      const [, , , , x, y] = raw.transform as number[];
      items.push({ x, y: viewport.height - y, text: raw.str.trim() });
    }

    items.sort((a, b) => a.y - b.y || a.x - b.x);
    let rowY = -1;
    let row: typeof items = [];

    const flushRow = () => {
      if (row.length === 0) return;
      const sorted = row.sort((a, b) => a.x - b.x);
      allRows.push({
        items: sorted.map(({ x, text }) => ({ x, text })),
        joined: sorted.map(i => i.text).join(' '),
      });
      row = [];
    };

    for (const item of items) {
      if (rowY < 0 || Math.abs(item.y - rowY) > 3) {
        flushRow();
        rowY = item.y;
      }
      row.push(item);
    }
    flushRow();
  }

  return allRows;
}

export async function extractRows(file: File): Promise<TextRow[]> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  return getRows(pdf);
}

export async function extractLines(file: File): Promise<string[]> {
  const rows = await extractRows(file);
  return rows.map(r => r.joined);
}

export async function extractFirstPageText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const rows = await getRows(pdf, 1);
  return rows.map(r => r.joined).join('\n');
}
