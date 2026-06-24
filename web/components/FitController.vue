<script lang="ts" setup>
const isExpanded = useIsExpanded();
</script>

<template>
  <div class="flex">
    <UButton
      :title="isExpanded ? 'Show sidebar' : 'Expand preview'"
      square
      size="lg"
      color="black"
      :icon="
        isExpanded
          ? 'i-heroicons-arrows-pointing-in'
          : 'i-heroicons-arrows-pointing-out'
      "
      @click="isExpanded = !isExpanded"
    />
  </div>
</template>
