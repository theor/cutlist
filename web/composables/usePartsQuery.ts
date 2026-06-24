import { useQuery } from '@tanstack/vue-query';
import type { PartToCut } from '@aklinker1/cutlist';

/**
 * Fetches the raw, unfiltered parts for the current project, branching on its
 * source (Onshape or local OpenSCAD). Shared by the BOM and the layout query;
 * vue-query dedupes by key so there's a single fetch.
 */
export default function () {
  const project = useProject();
  const source = computed(() => project.value?.source);

  return useQuery({
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
}
