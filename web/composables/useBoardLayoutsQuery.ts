import { useQuery } from '@tanstack/vue-query';
import {
  Distance,
  generateBoardLayouts,
  type Config,
  type PartToCut,
} from '@aklinker1/cutlist';

export default function () {
  const project = useProject();
  const { bladeWidth, optimize, extraSpace, distanceUnit, stock } =
    useProjectSettings();
  const parseStock = useParseStock();

  const source = computed(() => project.value?.source);
  const partsQuery = useQuery({
    queryKey: ['parts', computed(() => JSON.stringify(source.value ?? null))],
    queryFn: () => {
      const src = source.value;
      if (src?.type === 'onshape')
        return $fetch<PartToCut[]>('/api/parts', { query: { url: src.url } });
      if (src?.type === 'scad')
        return $fetch<PartToCut[]>('/api/scad-parts', {
          query: { path: src.path },
        });
      return Promise.resolve([] as PartToCut[]);
    },
    enabled: computed(() => {
      const src = source.value;
      if (src?.type === 'onshape') return !!src.url;
      if (src?.type === 'scad') return !!src.path;
      return false;
    }),
  });

  const regenerateKey = ref(0);

  const layouts = computed(() => {
    regenerateKey.value;
    const parts = partsQuery.data.value;
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
      precision: 1e-5,
    };
    return generateBoardLayouts(toRaw(parts), parseStock(stock.value), config);
  });

  function regenerate() {
    regenerateKey.value++;
  }

  function dumpTestCase() {
    const parts = partsQuery.data.value;
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
