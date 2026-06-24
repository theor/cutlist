<script lang="ts" setup>
import type { PartToCut } from '@aklinker1/cutlist';

const project = useProject();
const hasSource = computed(() => {
  const source = project.value?.source;
  if (source?.type === 'onshape') return !!source.url;
  if (source?.type === 'scad') return !!source.path;
  return false;
});

const { data: parts, isLoading } = usePartsQuery();
const { isDisabled, setDisabled } = useDisabledParts();
const { distanceUnit } = useProjectSettings();
const formatDistance = useFormatDistance();
const hoveredPartNumber = useHoveredPart();

const hasCabinets = computed(() => (parts.value ?? []).some((p) => p.cabinet));

const columns = computed(() => [
  { key: 'enabled', label: '', class: 'w-px' },
  { key: 'num', label: '#' },
  ...(hasCabinets.value ? [{ key: 'cabinet', label: 'Cabinet' }] : []),
  { key: 'name', label: 'Part Name' },
  { key: 'qty', label: 'QTY' },
  { key: 'material', label: 'Material' },
  { key: 'size', label: `Size (${distanceUnit.value})` },
]);

const partKey = (p: PartToCut) => {
  const [w, l] = [p.size.width, p.size.length].sort((a, b) => a - b);
  return `${p.cabinet ?? ''}|${p.name}|${p.material}|${p.size.thickness}|${w}|${l}`;
};

const rows = computed(() => {
  const map = (parts.value ?? []).reduce<Map<string, PartToCut[]>>(
    (acc, part) => {
      const key = partKey(part);
      const items = acc.get(key) ?? [];
      items.push(part);
      acc.set(key, items);
      return acc;
    },
    new Map(),
  );

  return [...map.values()]
    .toSorted((a, b) => a[0].partNumber - b[0].partNumber)
    .map((group) => {
      const part = group[0];
      const partNumbers = [...new Set(group.map((p) => p.partNumber))];
      const disabled = partNumbers.every((n) => isDisabled(n));
      const hovered = partNumbers.includes(hoveredPartNumber.value ?? -1);
      const { width, length, thickness } = part.size;
      return {
        num: part.partNumber,
        partNumbers,
        disabled,
        cabinet: part.cabinet ?? '—',
        name: part.name,
        qty: group.length,
        material: part.material,
        size: `${formatDistance(thickness)} × ${formatDistance(Math.min(width, length))} × ${formatDistance(Math.max(width, length))}`,
        class: [
          hovered ? 'bg-primary-50 dark:bg-primary-950' : '',
          disabled ? 'opacity-40 line-through' : '',
        ].join(' '),
      };
    });
});

const setEnabled = (row: (typeof rows.value)[number], enabled: boolean) => {
  row.partNumbers.forEach((n) => setDisabled(n, !enabled));
};

const onMouseMove = (e: MouseEvent) => {
  const tr = (e.target as Element).closest('tr');
  if (!tr) return;
  const tbody = tr.closest('tbody');
  if (!tbody) return;
  const index = Array.from(tbody.children).indexOf(tr as HTMLTableRowElement);
  if (index >= 0 && index < rows.value.length) {
    hoveredPartNumber.value = rows.value[index].num;
  }
};

const onMouseLeave = () => {
  hoveredPartNumber.value = null;
};
</script>

<template>
  <div
    class="absolute inset-0 print:relative"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
  >
    <p v-if="!hasSource" class="text-center p-4 opacity-50">
      Configure a source to get started...
    </p>
    <UTable v-else :columns="columns" :rows="rows" :loading="isLoading">
      <template #enabled-data="{ row }">
        <UCheckbox
          :model-value="!row.disabled"
          title="Include in layout"
          @update:model-value="setEnabled(row, $event)"
          @click.stop
        />
      </template>
    </UTable>
  </div>
</template>
