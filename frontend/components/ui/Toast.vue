<script setup lang="ts">
import { computed } from 'vue'
import { cva, type VariantProps } from 'class-variance-authority'

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-lg border p-4 pr-8 shadow-lg transition-all',
  {
    variants: {
      variant: {
        default: 'border bg-background text-foreground',
        success: 'border-green-500/50 bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-100',
        error: 'border-destructive/50 bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-100',
        warning: 'border-yellow-500/50 bg-yellow-50 text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-100',
        info: 'border-blue-500/50 bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-100',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export type ToastVariants = VariantProps<typeof toastVariants>

interface Props {
  variant?: ToastVariants['variant']
  title?: string
  description?: string
  duration?: number
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  duration: 5000,
})

const emit = defineEmits<{
  close: []
}>()

const classes = computed(() => toastVariants({ variant: props.variant }))

const iconPath = computed(() => {
  switch (props.variant) {
    case 'success':
      return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
    case 'error':
      return 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
    case 'warning':
      return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
    case 'info':
      return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    default:
      return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
  }
})

const iconColor = computed(() => {
  switch (props.variant) {
    case 'success': return 'text-green-500'
    case 'error': return 'text-red-500'
    case 'warning': return 'text-yellow-500'
    case 'info': return 'text-blue-500'
    default: return 'text-foreground'
  }
})

// Auto dismiss
let timeout: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  if (props.duration > 0) {
    timeout = setTimeout(() => {
      emit('close')
    }, props.duration)
  }
})

onUnmounted(() => {
  if (timeout) {
    clearTimeout(timeout)
  }
})
</script>

<template>
  <div :class="classes">
    <div class="flex items-start gap-3">
      <svg
        :class="['h-5 w-5 shrink-0', iconColor]"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" :d="iconPath" />
      </svg>
      <div class="flex-1">
        <p v-if="title" class="text-sm font-semibold">{{ title }}</p>
        <p v-if="description" class="text-sm opacity-90">{{ description }}</p>
        <slot />
      </div>
    </div>
    <button
      class="absolute right-2 top-2 rounded-md p-1 opacity-0 transition-opacity hover:opacity-100 focus:opacity-100 group-hover:opacity-70"
      @click="emit('close')"
    >
      <svg
        class="h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>
