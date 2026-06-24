import { describe, it, expect } from 'bun:test';
import { parseCutlistCsv } from '../csv';
import { Distance } from '../utils/units';

const CSV = `Part,Qty,Length,Width,Thickness,Material
Cabinet side,2,30.5,23,0.75,0.75 in stock
Door panel,1,26.375,13.875,0.25,0.25 in stock`;

describe('parseCutlistCsv', () => {
  it('expands Qty into instances and keeps part numbers per row', () => {
    const parts = parseCutlistCsv(CSV);
    expect(parts).toHaveLength(3);
    expect(parts.map((p) => [p.partNumber, p.instanceNumber])).toEqual([
      [1, 1],
      [1, 2],
      [2, 1],
    ]);
    expect(parts[2].name).toBe('Door panel');
    expect(parts[2].material).toBe('0.25 in stock');
  });

  it('converts inches to meters and uses the larger dimension as length', () => {
    const [side] = parseCutlistCsv(CSV);
    expect(side.size.length).toBeCloseTo(new Distance('30.5in').m, 9);
    expect(side.size.width).toBeCloseTo(new Distance('23in').m, 9);
    expect(side.size.thickness).toBeCloseTo(new Distance('0.75in').m, 9);
  });

  it('handles columns in any order and is case-insensitive', () => {
    const parts = parseCutlistCsv(
      `material,thickness,width,length,qty,part
Ply,0.75,4,8,1,Shelf`,
    );
    expect(parts[0]).toMatchObject({ name: 'Shelf', material: 'Ply' });
    expect(parts[0].size.length).toBeCloseTo(new Distance('8in').m, 9);
    expect(parts[0].size.width).toBeCloseTo(new Distance('4in').m, 9);
  });

  it('reads an optional cabinet column when present', () => {
    const parts = parseCutlistCsv(
      `Cabinet,Part,Qty,Length,Width,Thickness,Material
Base,Side,2,30,12,0.75,Ply`,
    );
    expect(parts.every((p) => p.cabinet === 'Base')).toBe(true);
    // No cabinet column => undefined, not an error.
    expect(parseCutlistCsv(CSV)[0].cabinet).toBeUndefined();
  });

  it('throws when a required column is missing', () => {
    expect(() => parseCutlistCsv('Part,Qty,Length,Width\nA,1,2,3')).toThrow(
      /thickness/i,
    );
  });
});
