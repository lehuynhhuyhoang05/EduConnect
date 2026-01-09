<script setup lang="ts">
import { computed } from 'vue'
import { cva, type VariantProps } from 'class-variance-authority'

const cardVariants = cva(
  'rounded-xl border bg-card text-card-foreground shadow',
  {
    variants: {
      variant: {
        default: '',
        outline: 'border-2',
        ghost: 'border-0 shadow-none',
        elevated: 'shadow-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export type CardVariants = VariantProps<typeof cardVariants>

interface Props {
  variant?: CardVariants['variant']
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
})

const classes = computed(() => cardVariants({ variant: props.variant }))
</script>

<template>
  <div :class="classes">
    <slot />
  </div>
</template>
