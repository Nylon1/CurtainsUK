import { parse as parseCsv } from "csv-parse/sync";
import * as XLSX from "xlsx";
import type { ParsedSupplierTable, SupplierImportDocument, SupplierImportFormat, SupplierImportParserOptions } from "./types";

const MAX_ROWS = 25_000;
const MAX_COLUMNS = 100;
const MAX_PDF_PAGES = 500;
const MAX_PDF_TEXT_ITEMS = 250_000;

function detectedFormat(document: SupplierImportDocument): SupplierImportFormat {
  if (document.format) return document.format;
  const extension = document.filename.toLowerCase().split(".").pop();
  if (extension === "csv" || extension === "tsv") return "CSV";
  if (extension === "xls") return "XLS";
  if (extension === "xlsx" || extension === "xlsm") return "XLSX";
  if (extension === "pdf" || document.mime_type === "application/pdf") return "PDF";
  throw new Error("UNSUPPORTED_SUPPLIER_IMPORT_FORMAT");
}

function uniqueHeaders(values: unknown[]) {
  const seen = new Map<string, number>();
  return values.slice(0, MAX_COLUMNS).map((value, index) => {
    const base = String(value ?? "").trim() || `column_${index + 1}`;
    const count = (seen.get(base.toLowerCase()) ?? 0) + 1;
    seen.set(base.toLowerCase(), count);
    return count === 1 ? base : `${base}#${count}`;
  });
}

function tableFromMatrix(
  matrix: unknown[][],
  format: SupplierImportFormat,
  options: SupplierImportParserOptions,
  sheetName: string | null,
  sourceObservedAt: string | null = null,
): ParsedSupplierTable {
  const headerRow = options.header_row ?? 0;
  if (!Number.isInteger(headerRow) || headerRow < 0 || headerRow >= matrix.length) throw new Error("IMPORT_HEADER_ROW_NOT_FOUND");
  const headers = uniqueHeaders(matrix[headerRow] ?? []);
  if (!headers.length) throw new Error("IMPORT_HEADERS_REQUIRED");
  const dataRows = matrix.slice(headerRow + 1).filter((row) => row.some((value) => String(value ?? "").trim() !== ""));
  if (dataRows.length > MAX_ROWS) throw new Error("SUPPLIER_IMPORT_ROW_LIMIT_EXCEEDED");
  const rows = dataRows.map((row) => Object.fromEntries(headers.map((header, index) => {
    const value = row[index];
    return [header, value === undefined || value === null || String(value).trim() === "" ? null : String(value).trim()];
  })));
  const warnings: string[] = [];
  if (matrix.some((row) => row.length > MAX_COLUMNS)) warnings.push(`Only the first ${MAX_COLUMNS} columns were imported.`);
  return { format, sheet_name: sheetName, source_observed_at: sourceObservedAt, headers, rows, warnings };
}

function parseDelimited(document: SupplierImportDocument, format: SupplierImportFormat, options: SupplierImportParserOptions) {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(document.bytes);
  const delimiter = options.delimiter ?? (document.filename.toLowerCase().endsWith(".tsv") ? "\t" : undefined);
  const matrix = parseCsv(text, {
    bom: true,
    delimiter,
    relax_column_count: true,
    skip_empty_lines: true,
    max_record_size: 1_000_000,
  }) as unknown[][];
  return tableFromMatrix(matrix, format, options, null);
}

function isSpreadsheetBytes(bytes: Uint8Array) {
  return (bytes[0] === 0x50 && bytes[1] === 0x4b) || (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0);
}

function parseSpreadsheet(document: SupplierImportDocument, format: SupplierImportFormat, options: SupplierImportParserOptions) {
  const workbook = XLSX.read(document.bytes, { type: "array", raw: false, cellDates: false, dense: true });
  const sheetName = options.sheet_name ?? workbook.SheetNames[0];
  if (!sheetName || !workbook.Sheets[sheetName]) throw new Error("IMPORT_WORKSHEET_NOT_FOUND");
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, raw: false, defval: "", blankrows: false });
  const modified = workbook.Props?.ModifiedDate;
  const created = workbook.Props?.CreatedDate;
  const observed = modified instanceof Date ? modified : created instanceof Date ? created : null;
  return tableFromMatrix(matrix, format, options, sheetName, observed?.toISOString() ?? null);
}

function splitPdfLine(cells: string[], delimiter: string | undefined) {
  if (!delimiter) return cells;
  const literal = delimiter === "\\t" ? "\t" : delimiter;
  return cells.join(" ").split(literal).map((value) => value.trim());
}

async function parsePdf(document: SupplierImportDocument, options: SupplierImportParserOptions) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = getDocument({ data: document.bytes.slice(), useWorkerFetch: false, isEvalSupported: false, verbosity: 0 });
  const pdf = await loadingTask.promise;
  if (pdf.numPages > MAX_PDF_PAGES) {
    await loadingTask.destroy();
    throw new Error("SUPPLIER_IMPORT_PDF_PAGE_LIMIT_EXCEEDED");
  }
  const matrix: string[][] = [];
  let textItemCount = 0;
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const lineMap = new Map<number, { y: number; cells: Array<{ x: number; text: string }> }>();
      for (const item of content.items) {
        if (!("str" in item) || !("transform" in item) || !item.str.trim()) continue;
        textItemCount += 1;
        if (textItemCount > MAX_PDF_TEXT_ITEMS) throw new Error("SUPPLIER_IMPORT_PDF_TEXT_LIMIT_EXCEEDED");
        const x = Number(item.transform[4]);
        const y = Number(item.transform[5]);
        const lineKey = Math.round(y / 2);
        let line = lineMap.get(lineKey);
        if (!line) {
          line = { y, cells: [] };
          lineMap.set(lineKey, line);
        }
        line.cells.push({ x, text: item.str.trim() });
      }
      const lines = [...lineMap.values()];
      lines.sort((a, b) => b.y - a.y);
      for (const line of lines) {
        const cells = line.cells.sort((a, b) => a.x - b.x).map((cell) => cell.text);
        matrix.push(splitPdfLine(cells, options.pdf_delimiter));
      }
      page.cleanup();
    }
  } finally {
    await loadingTask.destroy();
  }
  if (!matrix.length) throw new Error("PDF_HAS_NO_EXTRACTABLE_TEXT");
  const parsed = tableFromMatrix(matrix, "PDF", options, null);
  parsed.warnings.push("PDF extraction is positional; review every preview row before bulk apply. Scanned PDFs require OCR outside this importer.");
  return parsed;
}

export async function parseSupplierImportDocument(document: SupplierImportDocument, options: SupplierImportParserOptions = {}): Promise<ParsedSupplierTable> {
  const format = detectedFormat(document);
  if (format === "PDF") return parsePdf(document, options);
  if (format === "XLS" || format === "XLSX") return parseSpreadsheet(document, format, options);
  if (format === "PORTAL_EXPORT") {
    return isSpreadsheetBytes(document.bytes)
      ? parseSpreadsheet(document, format, options)
      : parseDelimited(document, format, options);
  }
  return parseDelimited(document, format, options);
}
