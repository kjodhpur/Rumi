/**
 * CSV for staff imports. Pure. RFC 4180: quoted fields, doubled quotes, commas and newlines
 * inside quotes, CRLF or LF, an optional UTF-8 byte-order mark. Files that aren't valid UTF-8
 * are read as Windows-1252, which is what Excel on Windows usually saves.
 */

export function decodeCsvBytes(bytes: Uint8Array): string {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    text = new TextDecoder("windows-1252").decode(bytes);
  }
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function parseCsv(input: string, maxRows = 20_000): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"' && field === "") quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      if (rows.length > maxRows) throw new Error(`too_many_rows`);
    } else field += c;
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows.map((r) => r.map((cell) => cell.trim()));
}

/** Header name → column index, matched case- and punctuation-insensitively. */
export function headerIndex(headers: string[]): (name: string) => number {
  const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");
  const map = new Map(headers.map((h, i) => [norm(h), i]));
  return (name: string) => map.get(norm(name)) ?? -1;
}

/** One CSV line for an error report (formula-safe, quoted when needed). */
export function csvLine(cells: string[]): string {
  return cells
    .map((value) => {
      let v = value;
      if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
      return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    })
    .join(",");
}
