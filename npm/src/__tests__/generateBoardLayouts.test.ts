import { describe, it, expect } from 'bun:test';
import { generateBoardLayouts } from '../index';
import testCase from '../../../test-case-backpedal.json';

describe('generateBoardLayouts - backpedal project', () => {
  it('packs all plywood parts onto 3 boards and leaves Unknown material as leftovers', () => {
    const { layouts, leftovers } = generateBoardLayouts(
      testCase.parts,
      testCase.stock,
      testCase.config,
    );

    const plywoodParts = testCase.parts.filter((p) => p.material === 'Plywood');
    const unknownParts = testCase.parts.filter((p) => p.material === 'Unknown');

    // All plywood fits on 3 sheets (exact per-board arrangement isn't asserted —
    // it depends on packing/rotation heuristics).
    expect(layouts).toHaveLength(3);
    for (const layout of layouts) {
      expect(layout.stock).toEqual({
        material: 'Plywood',
        thicknessM: expect.any(Number),
        widthM: 1.2192,
        lengthM: 2.4384,
      });
    }

    const placed = layouts.flatMap((l) => l.placements);
    const id = (p: { partNumber: number; instanceNumber: number }) =>
      `${p.partNumber}.${p.instanceNumber}`;
    expect(new Set(placed.map(id))).toEqual(new Set(plywoodParts.map(id)));

    // Unknown material has no matching stock → those parts are leftovers.
    expect(leftovers.map(id).sort()).toEqual(unknownParts.map(id).sort());
    expect(leftovers.every((l) => l.material === 'Unknown')).toBe(true);
  });
});
