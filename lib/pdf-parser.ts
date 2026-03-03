import { PDFParse } from "pdf-parse";

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
}

// Common date patterns: MM/DD/YYYY, MM-DD-YYYY, YYYY-MM-DD, MM/DD/YY
const DATE_PATTERN =
  /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/;

// Amount patterns: $1,234.56 or -$1,234.56 or 1234.56 or (1,234.56)
const AMOUNT_PATTERN =
  /[-]?\$?\s?[\d,]+\.\d{2}|\([\$]?[\d,]+\.\d{2}\)/;

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[\s$,]/g, "");
  // Handle parenthesized negatives: (123.45) → -123.45
  if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
    const val = parseFloat(cleaned.slice(1, -1));
    return isNaN(val) ? null : -val;
  }
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

function normalizeDate(raw: string): string | null {
  // Try to parse into YYYY-MM-DD
  const parts = raw.split(/[\/\-]/);
  if (parts.length !== 3) return null;

  let year: number, month: number, day: number;

  if (parts[0].length === 4) {
    // YYYY-MM-DD
    year = parseInt(parts[0]);
    month = parseInt(parts[1]);
    day = parseInt(parts[2]);
  } else {
    // MM/DD/YYYY or MM/DD/YY
    month = parseInt(parts[0]);
    day = parseInt(parts[1]);
    year = parseInt(parts[2]);
    if (year < 100) year += 2000;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export async function parsePdfTransactions(
  buffer: Buffer
): Promise<ParsedTransaction[]> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  const text = result.text;
  await parser.destroy();

  const lines = text.split("\n").map((l: string) => l.trim()).filter(Boolean);

  const transactions: ParsedTransaction[] = [];

  for (const line of lines) {
    const dateMatch = line.match(DATE_PATTERN);
    const amountMatch = line.match(AMOUNT_PATTERN);

    if (!dateMatch || !amountMatch) continue;

    const date = normalizeDate(dateMatch[1]);
    const amount = parseAmount(amountMatch[0]);

    if (!date || amount === null) continue;

    // Extract description: text between the date and the amount
    const dateEnd = dateMatch.index! + dateMatch[0].length;
    const amountStart = line.indexOf(amountMatch[0]);
    let description = line.slice(dateEnd, amountStart).trim();

    // Fallback: use the whole line minus date/amount if description is empty
    if (!description) {
      description = line
        .replace(dateMatch[0], "")
        .replace(amountMatch[0], "")
        .trim();
    }

    if (!description) description = "Parsed transaction";

    transactions.push({ date, description, amount });
  }

  return transactions;
}
