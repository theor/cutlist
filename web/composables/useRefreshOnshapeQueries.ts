import { useQueryClient } from '@tanstack/vue-query';

export default function () {
  const queries = useQueryClient();
  const project = useProject();
  return async () => {
    const source = project.value?.source;
    if (source?.type === 'onshape' && source.url) {
      await $fetch('/api/parts', {
        query: { url: source.url, refresh: 'true' },
      });
    } else if (source?.type === 'scad' && source.path) {
      // Re-run export-cutlist.sh (OpenSCAD) and reparse the CSV.
      await $fetch('/api/scad-parts', {
        query: { path: source.path, refresh: 'true' },
      });
    }
    await queries.refetchQueries({ queryKey: ['parts'] });
    await queries.refetchQueries({ queryKey: ['onshape'] });
  };
}
