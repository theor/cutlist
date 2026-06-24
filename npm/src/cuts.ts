import type { BoardLayout, BoardLayoutPlacement } from './types';

/**
 * A single straight, edge-to-edge saw cut.
 */
export interface Cut {
  /**
   * 1-based order the cut should be performed in.
   */
  order: number;
  /**
   * - `"crosscut"`: a horizontal line at a constant Y, spanning a range of X.
   *   Cuts across the width of the board (or sub-piece).
   * - `"rip"`: a vertical line at a constant X, spanning a range of Y. Cuts
   *   along the length of a strip.
   */
  orientation: 'crosscut' | 'rip';
  /**
   * Position of the cut along the axis perpendicular to the blade, in meters.
   * The Y coordinate for a crosscut, the X coordinate for a rip.
   */
  posM: number;
  /**
   * Where the cut line starts, in meters, measured along the cut direction (X
   * for a crosscut, Y for a rip).
   */
  startM: number;
  /**
   * Where the cut line ends, in meters, measured along the cut direction.
   */
  endM: number;
}

interface Rect {
  left: number;
  right: number;
  bottom: number;
  top: number;
}

/**
 * Derive the ordered list of guillotine cuts needed to free every part from a
 * board, in the order a person should make them on a table/track saw.
 *
 * The layout produced by the "cuts" optimizer is guillotine-cuttable: at every
 * step there is a straight cut, all the way across the current piece, that
 * separates the remaining parts into two groups. We find that cut, then recurse
 * into each side. Crosscuts are preferred over rips so the board is first broken
 * down into manageable strips, then each strip is ripped into parts.
 *
 * Parts that can't be separated by a guillotine cut (non-guillotine layouts)
 * are left without cuts rather than producing an invalid sequence.
 *
 * `minLeftoverM` is the smallest empty margin worth a dedicated trim cut.
 * Anything smaller is just the saw kerf between adjacent parts, not a reusable
 * offcut, so it's left alone. Defaults to 1/8" (a typical blade kerf).
 *
 * `maxCutLengthM` caps how long a single cut may be (e.g. a track saw's reach).
 * When a piece is longer than this, it's first broken down with shorter cuts in
 * the gaps between parts. This is best-effort: a part longer than the limit, or
 * a board wider than the limit in both directions, still forces a longer cut.
 */
export function generateCuts(
  layout: BoardLayout,
  { precision = 1e-5, minLeftoverM = 0.003175, maxCutLengthM = Infinity } = {},
): Cut[] {
  const cuts: Omit<Cut, 'order'>[] = [];
  const region: Rect = {
    left: 0,
    bottom: 0,
    right: layout.stock.widthM,
    top: layout.stock.lengthM,
  };
  const parts: Rect[] = layout.placements.map((p) => placementRect(p));

  recurse(region, parts, cuts, precision, minLeftoverM, maxCutLengthM);

  return cuts.map((cut, i) => ({ ...cut, order: i + 1 }));
}

function placementRect(p: BoardLayoutPlacement): Rect {
  return {
    left: p.leftM,
    right: p.rightM,
    bottom: p.bottomM,
    top: p.topM,
  };
}

function recurse(
  region: Rect,
  parts: Rect[],
  cuts: Omit<Cut, 'order'>[],
  precision: number,
  minLeftoverM: number,
  maxCutLengthM: number,
): void {
  if (parts.length <= 1) return;

  const next = (r: Rect, p: Rect[]) =>
    recurse(r, p, cuts, precision, minLeftoverM, maxCutLengthM);

  // When the piece is longer than the saw can cut, break it into manageable
  // sections first — this takes priority over trimming/splitting, otherwise a
  // long trim or separating cut would run before we get a chance to section.
  const section = findSectioningCut(region, parts, precision, maxCutLengthM);
  if (section) {
    cuts.push(section.cut);
    next(section.nearRegion, section.nearParts);
    next(section.farRegion, section.farParts);
    return;
  }

  // Peel off any empty margin around the parts. Otherwise a later separating
  // cut would run all the way across the region and slice the empty leftover
  // into pieces. Trimming keeps each offcut a single rectangle and shrinks the
  // region so subsequent cuts only span the parts.
  region = trimEmptyMargins(region, parts, cuts, minLeftoverM, maxCutLengthM);

  const split = findSplit(region, parts, precision);
  if (split == null) return;

  cuts.push(split.cut);
  // Order matters for the final numbering: process the "near" side (the piece
  // physically freed by this cut) before the rest, so its rips follow its
  // crosscut. `near` is always the lower/left group.
  next(split.nearRegion, split.nearParts);
  next(split.farRegion, split.farParts);
}

/**
 * If the region is longer than `maxLen`, find a cut that lops off a section no
 * longer than `maxLen` — but only along a direction whose cut actually fits the
 * limit (a crosscut's length is the region width, a rip's is its height). The
 * cut must fall in a gap between parts. Returns null when no such cut exists.
 */
function findSectioningCut(
  region: Rect,
  parts: Rect[],
  precision: number,
  maxLen: number,
): Split | null {
  const width = region.right - region.left;
  const height = region.top - region.bottom;

  // Crosscut (spans width) reduces height; only usable if the crosscut fits.
  if (height > maxLen + precision && width <= maxLen + precision) {
    const cut = sectioningCrosscut(region, parts, precision, maxLen);
    if (cut) return cut;
  }
  // Rip (spans height) reduces width; only usable if the rip fits.
  if (width > maxLen + precision && height <= maxLen + precision) {
    const cut = sectioningRip(region, parts, precision, maxLen);
    if (cut) return cut;
  }
  return null;
}

function sectioningCrosscut(
  region: Rect,
  parts: Rect[],
  precision: number,
  maxLen: number,
): Split | null {
  // Highest gap that still keeps the bottom section within the limit.
  const candidates = parts
    .map((p) => p.top)
    .filter((c) => c > region.bottom + precision && c < region.top - precision)
    .sort((a, b) => b - a);

  for (const c of candidates) {
    const below = parts.filter((p) => p.top <= c + precision);
    const above = parts.filter((p) => p.bottom >= c - precision);
    if (below.length + above.length !== parts.length) continue; // straddler
    if (below.length === 0 || above.length === 0) continue;

    const gapBottom = Math.max(...below.map((p) => p.top));
    const gapTop = Math.min(...above.map((p) => p.bottom));
    const posM = (gapBottom + gapTop) / 2;
    if (posM > region.bottom + maxLen + precision) continue;

    return {
      cut: {
        orientation: 'crosscut',
        posM,
        startM: region.left,
        endM: region.right,
      },
      nearRegion: { ...region, top: posM },
      nearParts: below,
      farRegion: { ...region, bottom: posM },
      farParts: above,
    };
  }
  return null;
}

function sectioningRip(
  region: Rect,
  parts: Rect[],
  precision: number,
  maxLen: number,
): Split | null {
  const candidates = parts
    .map((p) => p.right)
    .filter((c) => c > region.left + precision && c < region.right - precision)
    .sort((a, b) => b - a);

  for (const c of candidates) {
    const leftGroup = parts.filter((p) => p.right <= c + precision);
    const rightGroup = parts.filter((p) => p.left >= c - precision);
    if (leftGroup.length + rightGroup.length !== parts.length) continue;
    if (leftGroup.length === 0 || rightGroup.length === 0) continue;

    const gapLeft = Math.max(...leftGroup.map((p) => p.right));
    const gapRight = Math.min(...rightGroup.map((p) => p.left));
    const posM = (gapLeft + gapRight) / 2;
    if (posM > region.left + maxLen + precision) continue;

    return {
      cut: {
        orientation: 'rip',
        posM,
        startM: region.bottom,
        endM: region.top,
      },
      nearRegion: { ...region, right: posM },
      nearParts: leftGroup,
      farRegion: { ...region, left: posM },
      farParts: rightGroup,
    };
  }
  return null;
}

function boundingBox(parts: Rect[]): Rect {
  return {
    left: Math.min(...parts.map((p) => p.left)),
    right: Math.max(...parts.map((p) => p.right)),
    bottom: Math.min(...parts.map((p) => p.bottom)),
    top: Math.max(...parts.map((p) => p.top)),
  };
}

/**
 * Cut away the empty margins between the region edges and the parts' bounding
 * box, emitting one cut per margin. At each step the margin that frees the
 * largest single rectangle is cut first, so the biggest reusable offcut is kept
 * whole instead of being fragmented by a later separating cut.
 *
 * Trims whose cut would exceed `maxLen` are deferred — once a within-limit trim
 * (or section) shrinks the region, the deferred margin usually fits and is cut
 * on a later pass.
 */
function trimEmptyMargins(
  region: Rect,
  parts: Rect[],
  cuts: Omit<Cut, 'order'>[],
  minLeftoverM: number,
  maxLen: number,
): Rect {
  let r = region;
  for (;;) {
    const bb = boundingBox(parts);
    const candidates: { area: number; cut: Omit<Cut, 'order'>; next: Rect }[] =
      [];
    const height = r.top - r.bottom;
    const width = r.right - r.left;
    // A rip's length is the region height; a crosscut's is its width.
    const ripFits = height <= maxLen + minLeftoverM;
    const crosscutFits = width <= maxLen + minLeftoverM;

    if (ripFits && r.right - bb.right > minLeftoverM)
      candidates.push({
        area: (r.right - bb.right) * height,
        cut: {
          orientation: 'rip',
          posM: bb.right,
          startM: r.bottom,
          endM: r.top,
        },
        next: { ...r, right: bb.right },
      });
    if (ripFits && bb.left - r.left > minLeftoverM)
      candidates.push({
        area: (bb.left - r.left) * height,
        cut: {
          orientation: 'rip',
          posM: bb.left,
          startM: r.bottom,
          endM: r.top,
        },
        next: { ...r, left: bb.left },
      });
    if (crosscutFits && r.top - bb.top > minLeftoverM)
      candidates.push({
        area: (r.top - bb.top) * width,
        cut: {
          orientation: 'crosscut',
          posM: bb.top,
          startM: r.left,
          endM: r.right,
        },
        next: { ...r, top: bb.top },
      });
    if (crosscutFits && bb.bottom - r.bottom > minLeftoverM)
      candidates.push({
        area: (bb.bottom - r.bottom) * width,
        cut: {
          orientation: 'crosscut',
          posM: bb.bottom,
          startM: r.left,
          endM: r.right,
        },
        next: { ...r, bottom: bb.bottom },
      });

    if (candidates.length === 0) return r;

    candidates.sort((a, b) => b.area - a.area);
    cuts.push(candidates[0].cut);
    r = candidates[0].next;
  }
}

interface Split {
  cut: Omit<Cut, 'order'>;
  nearRegion: Rect;
  nearParts: Rect[];
  farRegion: Rect;
  farParts: Rect[];
}

/**
 * Find a single guillotine cut for the region. Prefers a crosscut (so the board
 * is broken into strips first), and among valid cuts picks the one closest to
 * the bottom/left edge so pieces are peeled off one end.
 */
function findSplit(
  region: Rect,
  parts: Rect[],
  precision: number,
): Split | null {
  const crosscut = findCrosscut(region, parts, precision);
  if (crosscut) return crosscut;
  return findRip(region, parts, precision);
}

function findCrosscut(
  region: Rect,
  parts: Rect[],
  precision: number,
): Split | null {
  // Candidate Y values: the top edge of every part. A crosscut at Y=c is valid
  // if no part straddles it.
  const candidates = parts
    .map((p) => p.top)
    .filter((c) => c > region.bottom + precision && c < region.top - precision)
    .sort((a, b) => a - b);

  for (const c of candidates) {
    const below = parts.filter((p) => p.top <= c + precision);
    const above = parts.filter((p) => p.bottom >= c - precision);
    if (below.length + above.length !== parts.length) continue; // straddler
    if (below.length === 0 || above.length === 0) continue;

    // Place the line in the gap between the two groups.
    const gapBottom = Math.max(...below.map((p) => p.top));
    const gapTop = Math.min(...above.map((p) => p.bottom));
    const posM = (gapBottom + gapTop) / 2;

    return {
      cut: {
        orientation: 'crosscut',
        posM,
        startM: region.left,
        endM: region.right,
      },
      nearRegion: { ...region, top: posM },
      nearParts: below,
      farRegion: { ...region, bottom: posM },
      farParts: above,
    };
  }
  return null;
}

function findRip(region: Rect, parts: Rect[], precision: number): Split | null {
  const candidates = parts
    .map((p) => p.right)
    .filter((c) => c > region.left + precision && c < region.right - precision)
    .sort((a, b) => a - b);

  for (const c of candidates) {
    const leftGroup = parts.filter((p) => p.right <= c + precision);
    const rightGroup = parts.filter((p) => p.left >= c - precision);
    if (leftGroup.length + rightGroup.length !== parts.length) continue;
    if (leftGroup.length === 0 || rightGroup.length === 0) continue;

    const gapLeft = Math.max(...leftGroup.map((p) => p.right));
    const gapRight = Math.min(...rightGroup.map((p) => p.left));
    const posM = (gapLeft + gapRight) / 2;

    return {
      cut: {
        orientation: 'rip',
        posM,
        startM: region.bottom,
        endM: region.top,
      },
      nearRegion: { ...region, right: posM },
      nearParts: leftGroup,
      farRegion: { ...region, left: posM },
      farParts: rightGroup,
    };
  }
  return null;
}
