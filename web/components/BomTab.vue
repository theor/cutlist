<script lang="ts" setup>
import type { BoardLayoutLeftover } from '@aklinker1/cutlist';

const url = useAssemblyUrl();
const { data: doc } = useDocumentQuery(url);
const { data, isLoading } = useBoardLayoutsQuery();
const { distanceUnit } = useProjectSettings();
const formatDistance = useFormatDistance();

const rows = computed(() => {
  if (data.value == null) return [];

  const partKey = (part: BoardLayoutLeftover) =>
    `${part.name}|${part.material}|${part.thicknessM}|${part.widthM}|${part.lengthM}`;

  const map = [
    ...data.value?.layouts.flatMap((layout) => layout.placements),
    ...data.value?.leftovers,
  ].reduce<Map<string, BoardLayoutLeftover[]>>((acc, part) => {
    const key = partKey(part);
    const items = acc.get(key) ?? [];
    items.push(part);
    acc.set(key, items);
    return acc;
  }, new Map());

  return [...map.values()]
    .toSorted((a, b) => a[0].partNumber - b[0].partNumber)
    .map((instanceList) => {
      const part = instanceList[0];
      return {
        '#': part.partNumber,
        'Part Name': part.name,
        QTY: instanceList.length,
        Material: part.material,
        [`Size (${distanceUnit.value})`]: `${formatDistance(part.thicknessM)} × ${formatDistance(part.widthM)} × ${formatDistance(part.lengthM)}`,
      };
    });
});
</script>

<template>
  <div class="absolute inset-0 print:relative">
    <p v-if="doc == null" class="text-center p-4 opacity-50">
      Enter an assembly URL to get started...
    </p>
    <UTable v-else :rows="rows" :loading="isLoading" />
  </div>
</template>
