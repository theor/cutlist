import type { PartToCut } from './types';
import { Distance } from './utils/units';

/**
 * Parse a cutlist CSV (e.g. produced by an OpenSCAD export) into parts.
 *
 * Expected columns (case-insensitive, any order):
 *   Part, Qty, Length, Width, Thickness, Material
 *
 * Dimensions are assumed to be in inches — matching the OpenSCAD exporter and
 * material names like "0.75 in stock". Each row is expanded into `Qty`
 * instances. Following the same convention as the Onshape import, the larger of
 * Length/Width becomes the part length so equivalent parts group together.
 */
export function parseCutlistCsv(csv: string): PartToCut[] {
  const rows = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(splitCsvLine);
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = {
    part: header.indexOf('part'),
    qty: header.indexOf('qty'),
    length: header.indexOf('length'),
    width: header.indexOf('width'),
    thickness: header.indexOf('thickness'),
    material: header.indexOf('material'),
  };
  for (const [key, index] of Object.entries(col)) {
    if (index < 0)
      throw new Error(`Cutlist CSV is missing the "${key}" column`);
  }

  // Optional: a column naming the assembly/cabinet each part belongs to.
  const cabinetCol = ['cabinet', 'cabinet name', 'assembly'].reduce(
    (found, name) => (found >= 0 ? found : header.indexOf(name)),
    -1,
  );

  const inchesToM = (value: string | undefined) =>
    new Distance(`${parseFloat(value ?? '') || 0}in`).m;

  const parts: PartToCut[] = [];
  let partNumber = 0;
  for (const cells of rows.slice(1)) {
    const name = cells[col.part]?.trim();
    if (!name) continue;

    partNumber++;
    const qty = Math.max(1, Math.floor(Number(cells[col.qty]) || 1));
    const a = inchesToM(cells[col.length]);
    const b = inchesToM(cells[col.width]);
    const size = {
      length: Math.max(a, b),
      width: Math.min(a, b),
      thickness: inchesToM(cells[col.thickness]),
    };
    const material = cells[col.material]?.trim() ?? '';
    const cabinet =
      cabinetCol >= 0 ? cells[cabinetCol]?.trim() || undefined : undefined;

    for (let instanceNumber = 1; instanceNumber <= qty; instanceNumber++) {
      parts.push({ partNumber, instanceNumber, name, cabinet, material, size });
    }
  }
  return parts;
}

/**
 * Split a single CSV line, honoring double-quoted fields (so a value may
 * contain a comma). Doubled quotes inside a quoted field are an escaped quote.
 */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      cells.push(cell);
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells;
}
