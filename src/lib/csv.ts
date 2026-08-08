const SPREADSHEET_FORMULA_PREFIX = /^[\s\u0000-\u001f\u007f]*[=+\-@]/u;
const SPREADSHEET_CONTROL_PREFIX = /^[\t\r]/u;

/**
 * Prefixa células interpretáveis como fórmula por Excel/Sheets/LibreOffice.
 * A aspa simples força texto e é aplicada antes do escape sintático do CSV.
 */
export function neutralizeSpreadsheetFormula(value: string): string {
  if (SPREADSHEET_FORMULA_PREFIX.test(value) || SPREADSHEET_CONTROL_PREFIX.test(value)) {
    return `'${value}`;
  }
  return value;
}

export function escapeCsvCell(value: unknown): string {
  const text = neutralizeSpreadsheetFormula(String(value ?? ""));
  if (/[",\r\n]/u.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}
