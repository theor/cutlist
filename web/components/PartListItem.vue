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
        class="w-full text-clip text-gray-500 dark:text-gray-400 print:text-black group-hover:text-primary text-right p-px"
        :class="{ 'text-primary': isHighlighted }"
        :style="`font-size:${fontSize};line-height:${fontSize}`"
      >
        {{ placement.partNumber }}
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
