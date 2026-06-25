import {
  Distance,
  generateBoardLayouts,
  type Config,
} from '@aklinker1/cutlist';

export default function () {
  const {
    bladeWidth,
    optimize,
    extraSpace,
    allowRotations,
    rotateAll,
    distanceUnit,
    stock,
  } = useProjectSettings();
  const parseStock = useParseStock();

  const partsQuery = usePartsQuery();
  const { disabled } = useDisabledParts();

  // Parts the user hasn't disabled — the ones actually laid out.
  const enabledParts = computed(() =>
    partsQuery.data.value?.filter(
      (part) => !disabled.value.has(part.partNumber),
    ),
  );

  const regenerateKey = ref(0);

  const layouts = computed(() => {
    regenerateKey.value;
    const parts = enabledParts.value;
    if (
      parts == null ||
      bladeWidth.value == null ||
      extraSpace.value == null ||
      optimize.value == null ||
      distanceUnit.value == null ||
      stock.value == null
    )
      return;

    const config: Config = {
      bladeWidth: new Distance(bladeWidth.value + distanceUnit.value).m,
      extraSpace: new Distance(extraSpace.value + distanceUnit.value).m,
      optimize: optimize.value === 'Cuts' ? 'cuts' : 'space',
      allowRotations: allowRotations.value ?? true,
      // Only applies when rotation-to-fit is off.
      rotateAll: !allowRotations.value && (rotateAll.value ?? false),
      precision: 1e-5,
    };
    return generateBoardLayouts(toRaw(parts), parseStock(stock.value), config);
  });

  function regenerate() {
    regenerateKey.value++;
  }

  function dumpTestCase() {
    const parts = enabledParts.value;
    if (
      parts == null ||
      bladeWidth.value == null ||
      extraSpace.value == null ||
      optimize.value == null ||
      distanceUnit.value == null ||
      stock.value == null
    )
      return;

    const config: Config = {
      bladeWidth: new Distance(bladeWidth.value + distanceUnit.value).m,
      extraSpace: new Distance(extraSpace.value + distanceUnit.value).m,
      optimize: optimize.value === 'Cuts' ? 'cuts' : 'space',
      allowRotations: allowRotations.value ?? true,
      // Only applies when rotation-to-fit is off.
      rotateAll: !allowRotations.value && (rotateAll.value ?? false),
      precision: 1e-5,
    };

    const testCase = {
      parts: toRaw(parts),
      stock: parseStock(stock.value),
      config,
    };

    const blob = new Blob([JSON.stringify(testCase, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'test-case.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    ...partsQuery,
    data: layouts,
    regenerate,
    dumpTestCase,
  };
}
