<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'text',
  animation: 'pulse',
})

const styles = computed(() => {
  const result: Record<string, string> = {}
  
  if (props.width) {
    result.width = typeof props.width === 'number' ? `${props.width}px` : props.width
  }
  
  if (props.height) {
    result.height = typeof props.height === 'number' ? `${props.height}px` : props.height
  }
  
  return result
})

const classes = computed(() => [
  'bg-muted',
  {
    'h-4 w-full rounded': props.variant === 'text',
    'rounded-full aspect-square': props.variant === 'circular',
    'rounded-none': props.variant === 'rectangular',
    'rounded-lg': props.variant === 'rounded',
    'animate-pulse': props.animation === 'pulse',
    'animate-shimmer': props.animation === 'wave',
  },
])
</script>

<template>
  <div :class="classes" :style="styles" />
</template>
