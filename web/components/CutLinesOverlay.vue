<script lang="ts" setup>
import { type BoardLayout, generateCuts } from '@aklinker1/cutlist';

const props = defineProps<{
  layout: BoardLayout;
}>();

// Pixels per meter, matching useGetPx (`value * 500`).
const PX_PER_M = 500;

const wPx = computed(() => props.layout.stock.widthM * PX_PER_M);
const hPx = computed(() => props.layout.stock.lengthM * PX_PER_M);

// The board's coordinate system is bottom-up (y=0 at the bottom); SVG is
// top-down, so flip Y when converting meters to pixels.
const toX = (m: number) => m * PX_PER_M;
const toY = (m: number) => (props.layout.stock.lengthM - m) * PX_PER_M;

// Distinct hue per cut, spread evenly around the wheel so neighbouring cuts
// (which are often next to each other on the board) are easy to tell apart.
const colorFor = (index: number, count: number) =>
  `hsl(${Math.round((index * 360) / Math.max(count, 1))}, 75%, 45%)`;

const cuts = computed(() => {
  const raw = generateCuts(props.layout);
  return raw.map((cut, i) => {
    const color = colorFor(i, raw.length);

    // tail = where the numbered badge sits, head = where the arrow points.
    let tx: number, ty: number, hx: number, hy: number;
    if (cut.orientation === 'crosscut') {
      const y = toY(cut.posM);
      tx = toX(cut.startM);
      ty = y;
      hx = toX(cut.endM);
      hy = y;
    } else {
      const x = toX(cut.posM);
      tx = x;
      ty = toY(cut.startM);
      hx = x;
      hy = toY(cut.endM);
    }

    // Unit direction tail -> head (lines are axis-aligned).
    const len = Math.hypot(hx - tx, hy - ty) || 1;
    const dx = (hx - tx) / len;
    const dy = (hy - ty) / len;
    const px = -dy; // perpendicular
    const py = dx;

    // Arrowhead triangle at the head.
    const baseX = hx - dx * 10;
    const baseY = hy - dy * 10;
    const arrow = [
      `${hx},${hy}`,
      `${baseX + px * 5},${baseY + py * 5}`,
      `${baseX - px * 5},${baseY - py * 5}`,
    ].join(' ');

    return {
      order: cut.order,
      color,
      x1: tx,
      y1: ty,
      x2: hx,
      y2: hy,
      arrow,
      // Badge inset from the tail so it sits on the board, not off the edge.
      labelX: tx + dx * 12,
      labelY: ty + dy * 12,
    };
  });
});
</script>

<template>
  <svg
    class="absolute inset-0 pointer-events-none"
    :width="wPx"
    :height="hPx"
    :viewBox="`0 0 ${wPx} ${hPx}`"
  >
    <g v-for="cut of cuts" :key="cut.order">
      <line
        :x1="cut.x1"
        :y1="cut.y1"
        :x2="cut.x2"
        :y2="cut.y2"
        :stroke="cut.color"
        stroke-width="2"
        stroke-dasharray="6 4"
      />
      <polygon :points="cut.arrow" :fill="cut.color" />
      <circle :cx="cut.labelX" :cy="cut.labelY" r="9" :fill="cut.color" />
      <text
        :x="cut.labelX"
        :y="cut.labelY"
        text-anchor="middle"
        dominant-baseline="central"
        font-size="11"
        font-weight="bold"
        fill="white"
      >
        {{ cut.order }}
      </text>
    </g>
  </svg>
</template>
