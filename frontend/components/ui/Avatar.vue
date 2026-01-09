<script setup lang="ts">
import { computed } from 'vue'
import { cva, type VariantProps } from 'class-variance-authority'

const avatarVariants = cva(
  'relative flex shrink-0 overflow-hidden rounded-full',
  {
    variants: {
      size: {
        xs: 'h-6 w-6',
        sm: 'h-8 w-8',
        md: 'h-10 w-10',
        lg: 'h-12 w-12',
        xl: 'h-16 w-16',
        '2xl': 'h-24 w-24',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
)

export type AvatarVariants = VariantProps<typeof avatarVariants>

interface Props {
  size?: AvatarVariants['size']
  src?: string
  alt?: string
  fallback?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  alt: 'Avatar',
})

const classes = computed(() => avatarVariants({ size: props.size }))

const initials = computed(() => {
  if (props.fallback) return props.fallback.slice(0, 2).toUpperCase()
  if (props.alt) {
    const words = props.alt.split(' ')
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase()
    }
    return props.alt.slice(0, 2).toUpperCase()
  }
  return '?'
})

const hasError = ref(false)

const handleError = () => {
  hasError.value = true
}
</script>

<template>
  <span :class="classes">
    <img
      v-if="src && !hasError"
      :src="src"
      :alt="alt"
      class="aspect-square h-full w-full object-cover"
      @error="handleError"
    />
    <span
      v-else
      class="flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground"
    >
      {{ initials }}
    </span>
  </span>
</template>
