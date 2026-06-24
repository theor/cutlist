import { Distance } from '@aklinker1/cutlist';

/**
 * The project's max cut length in meters, for `generateCuts`. 0 (or unset)
 * means no limit, represented as Infinity.
 */
export default function () {
  const { maxCutLength, distanceUnit } = useProjectSettings();
  return computed(() => {
    if (!maxCutLength.value || distanceUnit.value == null) return Infinity;
    return new Distance(maxCutLength.value + distanceUnit.value).m;
  });
}
