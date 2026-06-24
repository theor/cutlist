import { describe, it, expect } from 'bun:test';
import { generateCuts } from '../cuts';
import type { BoardLayout, BoardLayoutPlacement } from '../types';

function part(
  partNumber: number,
  leftM: number,
  bottomM: number,
  rightM: number,
  topM: number,
): BoardLayoutPlacement {
  return {
    partNumber,
    instanceNumber: 1,
    name: `p${partNumber}`,
    material: 'm',
    thicknessM: 0.02,
    leftM,
    bottomM,
    rightM,
    topM,
    widthM: rightM - leftM,
    lengthM: topM - bottomM,
  };
}

// 1m wide x 2m tall board, two parts stacked with a gap and an empty right
// margin — so the naive first cut is a full 2m rip down the side.
const TALL: BoardLayout = {
  stock: { material: 'm', widthM: 1, lengthM: 2, thicknessM: 0.02 },
  placements: [part(1, 0, 0, 0.6, 0.9), part(2, 0, 1.0, 0.6, 1.9)],
};

const longest = (cuts: { startM: number; endM: number }[]) =>
  Math.max(...cuts.map((c) => c.endM - c.startM));

describe('generateCuts maxCutLengthM', () => {
  it('produces a cut longer than the limit without one', () => {
    expect(longest(generateCuts(TALL))).toBeGreaterThan(1);
  });

  it('sections the board so no cut exceeds the limit', () => {
    const cuts = generateCuts(TALL, { maxCutLengthM: 1 });
    for (const cut of cuts) {
      expect(cut.endM - cut.startM).toBeLessThanOrEqual(1 + 1e-6);
    }
  });
});
