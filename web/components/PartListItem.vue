<script lang="ts" setup>
import type { BoardLayoutPlacement } from '@aklinker1/cutlist';
import { useElementHover } from '@vueuse/core';

const props = defineProps<{
  placement: BoardLayoutPlacement;
}>();

const container = ref<HTMLDivElement>();
const isLocallyHovered = useElementHover(container);
const hoveredPartNumber = useHoveredPart();

const isHighlighted = computed(
  () =>
    isLocallyHovered.value ||
    hoveredPartNumber.value === props.placement.partNumber,
);

watch(isLocallyHovered, (hovered) => {
  if (hovered) hoveredPartNumber.value = props.placement.partNumber;
  else if (hoveredPartNumber.value === props.placement.partNumber)
    hoveredPartNumber.value = null;
});

const width = usePx(() => props.placement.widthM);
const height = usePx(() => props.placement.lengthM);
const left = usePx(() => props.placement.leftM);
const bottom = usePx(() => props.placement.bottomM);

const fontSize = usePx(() =>
  Math.min(
    props.placement.widthM / 2,
    0.0254, // 1 in to m
  ),
);

const { showPartNumbers } = useProjectSettings();
const showDimensions = useShowDimensions();

const partWidth = useFormattedDistance(() => props.placement.widthM);
const partLength = useFormattedDistance(() => props.placement.lengthM);

const dimFontSize = usePx(() => {
  // Longest of the two labels constrains the horizontal fit.
  const maxChars = Math.max(
    partWidth.value?.length ?? 0,
    partLength.value?.length ?? 0,
    1,
  );
  // ~0.6 = average glyph width/height ratio for the monospace-ish labels.
  const widthLimit = props.placement.widthM / (maxChars * 0.6);
  // Two stacked lines need to fit vertically.
  const heightLimit = props.placement.lengthM / 2.4;
  // 0.9 keeps a little breathing room from the edges.
  return Math.min(widthLimit, heightLimit) * 0.9;
});
</script>

<template>
  <div
    ref="container"
    class="absolute cursor-pointer group"
    :style="`bottom:${bottom};left:${left}`"
  >
    <UPlaceholder
      class="overflow-hidden"
      :color="isHighlighted ? 'primary' : 'white'"
      :style="`width:${width};height:${height}`"
    >
      <p
        v-if="showPartNumbers"
        class="relative z-10 w-full text-clip text-gray-500 dark:text-gray-400 print:text-black group-hover:text-primary text-right p-px"
        :class="{ 'text-primary': isHighlighted }"
        :style="`font-size:${fontSize};line-height:${fontSize}`"
      >
        {{ placement.partNumber }}
      </p>
      <p
        v-if="showDimensions"
        class="absolute inset-0 flex items-center justify-center text-center text-gray-600 dark:text-gray-300 print:text-black pointer-events-none leading-tight"
        :style="`font-size:${dimFontSize};line-height:${dimFontSize}`"
      >
        {{ partWidth }}<br />{{ partLength }}
      </p>
    </UPlaceholder>
    <Teleport to="body">
      <PartDetailsTooltip
        v-if="isLocallyHovered"
        :part="placement"
        class="pointer-events-none"
      />
    </Teleport>
  </div>
</template>
