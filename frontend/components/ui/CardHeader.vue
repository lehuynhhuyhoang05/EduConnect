<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <div class="flex flex-col space-y-1.5 p-6">
    <h3 v-if="title" class="text-2xl font-semibold leading-none tracking-tight">
      {{ title }}
    </h3>
    <p v-if="description" class="text-sm text-muted-foreground">
      {{ description }}
    </p>
    <slot />
  </div>
</template>
