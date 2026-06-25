import { Rectangle, isNearlyEqual } from '../geometry';
import type { Visualizer } from '../visualizers';
import type { PackOptions, PackResult, Packer } from './Packer';
import { createTightPacker } from './TightPacker';

/**
 * This packer aligns all items by length, and adds each rect in rows until the
 * board is filled up. Once full, it tightly packs any parts not placed to fill
 * the rest of the bin.
 */
export function createCutPacker<T>(visualizer?: Visualizer): Packer<T> {
  const orientateLengthWise = <T>(rect: Rectangle<T>): Rectangle<T> =>
    rect.width > rect.height ? rect.flipOrientation() : rect;

  const tight = createTightPacker(visualizer);

  const getRows = (
    bin: Rectangle<unknown>,
    placements: Rectangle<T>[],
    options: PackOptions,
  ) =>
    placements
      .filter((p) => isNearlyEqual(0, p.left, options.precision))
      .map((p) => {
        const othersInRow = placements.filter(
          (o) =>
            o !== p && isNearlyEqual(p.bottom, o.bottom, options.precision),
        );
        return [p, ...othersInRow];
      })
      .map((rowRects) => {
        const rowBin = new Rectangle(
          null,
          rowRects[0].left,
          rowRects[0].bottom,
          bin.width,
          rowRects[0].height,
        );
        return {
          rects: rowRects,
          bin: rowBin,
        };
      });

  // Portrait by default (length running up the board). When `rotateAll` is set,
  // force the opposite (landscape) so every part is turned 90°.
  const orientate = <T>(
    rect: Rectangle<T>,
    rotateAll?: boolean,
  ): Rectangle<T> =>
    rotateAll
      ? rect.width < rect.height
        ? rect.flipOrientation()
        : rect
      : orientateLengthWise(rect);

  return {
    pack(bin, rects, options) {
      rects = rects
        .map((rect) => orientate(rect, options.rotateAll))
        .toSorted((a, b) => {
          if (!isNearlyEqual(a.height, b.height, options.precision))
            return b.height - a.height;
          return b.width * b.height - a.width * a.height;
        });

      let lastRowStarter: Rectangle<T> | undefined;
      let lastPlacement: Rectangle<T> | undefined;

      const res = rects.reduce<{
        placements: Rectangle<T>[];
        leftovers: Rectangle<T>[];
      }>(
        (res, rect) => {
          visualizer?.render('start', { res, bin, toPlace: rect });
          const possiblePoints =
            !lastPlacement || !lastRowStarter
              ? [bin.bottomLeft]
              : [
                  lastPlacement.bottomRight.add(options.gap, 0),
                  lastRowStarter.topLeft.add(0, options.gap),
                ];
          visualizer?.render('possible-points', {
            res,
            bin,
            toPlace: rect,
            possiblePoints,
          });

          const possiblePlacements = possiblePoints.map((point) =>
            rect.moveTo(point),
          );
          const validPlacements = possiblePlacements.filter((p) =>
            p.isInside(bin, options.precision),
          );
          visualizer?.render('placements', {
            res,
            bin,
            toPlace: rect,
            validPlacements,
            possiblePlacements,
          });
          if (validPlacements.length > 0) {
            const p = validPlacements[0];
            res.placements.push(p);
            lastPlacement = p;
            if (
              lastRowStarter == null ||
              isNearlyEqual(0, p.left, options.precision)
            ) {
              lastRowStarter = p;
            }
          } else {
            res.leftovers.push(rect);
          }
          visualizer?.render('placed', { res, bin });
          return res;
        },
        {
          leftovers: [],
          placements: [],
        },
      );

      // Group rectanbles by row
      const rows = res.placements
        .filter((p) => isNearlyEqual(0, p.left, options.precision))
        .map((p) => {
          const othersInRow = res.placements.filter(
            (o) =>
              o !== p && isNearlyEqual(p.bottom, o.bottom, options.precision),
          );
          return [p, ...othersInRow];
        })
        .map((rowRects) => {
          const rowBin = new Rectangle(
            null,
            rowRects[0].left,
            rowRects[0].bottom,
            bin.width,
            rowRects[0].height,
          );
          return {
            rects: rowRects,
            bin: rowBin,
          };
        });

      // Tightly pack the parts that didn't fit into rows. Rotation is allowed
      // here (when enabled) so a leftover part can turn 90° to fill a gap.
      const tightRes: PackResult<T> = {
        placements: [...res.placements],
        leftovers: [],
      };
      // Leftovers are already oriented above, so don't re-rotate them here.
      tight.addToPack(tightRes, bin, res.leftovers, {
        ...options,
        rotateAll: false,
      });

      return tightRes;
    },
    addToPack() {
      throw Error('Not supported');
    },
  };
}
