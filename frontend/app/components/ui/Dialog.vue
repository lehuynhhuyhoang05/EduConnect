<script setup lang="ts">
import { ref, watch, computed } from 'vue'

interface Props {
  open: boolean
  title?: string
  description?: string
  closeOnOverlay?: boolean
  closeOnEscape?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

const props = withDefaults(defineProps<Props>(), {
  closeOnOverlay: true,
  closeOnEscape: true,
  size: 'md',
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  close: []
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

const close = () => {
  isOpen.value = false
  emit('close')
}

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    close()
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.closeOnEscape) {
    close()
  }
}

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'max-w-sm'
    case 'lg': return 'max-w-2xl'
    case 'xl': return 'max-w-4xl'
    case 'full': return 'max-w-[95vw] h-[95vh]'
    default: return 'max-w-lg'
  }
})

// Body scroll lock
watch(isOpen, (value) => {
  if (value) {
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeydown)
  } else {
    document.body.style.overflow = ''
    document.removeEventListener('keydown', handleKeydown)
  }
})

onUnmounted(() => {
  document.body.style.overflow = ''
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- Overlay -->
        <div
          class="fixed inset-0 bg-black/50 backdrop-blur-sm"
          @click="handleOverlayClick"
        />
        
        <!-- Dialog -->
        <Transition
          enter-active-class="transition-all duration-200"
          enter-from-class="scale-95 opacity-0"
          enter-to-class="scale-100 opacity-100"
          leave-active-class="transition-all duration-200"
          leave-from-class="scale-100 opacity-100"
          leave-to-class="scale-95 opacity-0"
        >
          <div
            v-if="isOpen"
            :class="[
              'relative z-50 w-full rounded-xl bg-background p-6 shadow-lg',
              sizeClasses,
            ]"
            role="dialog"
            aria-modal="true"
          >
            <!-- Close button -->
            <button
              class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              @click="close"
            >
              <svg
                class="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
              <span class="sr-only">Close</span>
            </button>

            <!-- Header -->
            <div v-if="title || description" class="mb-4">
              <h2 v-if="title" class="text-lg font-semibold leading-none tracking-tight">
                {{ title }}
              </h2>
              <p v-if="description" class="mt-2 text-sm text-muted-foreground">
                {{ description }}
              </p>
            </div>

            <!-- Content -->
            <slot />

            <!-- Footer -->
            <div v-if="$slots.footer" class="mt-6 flex justify-end space-x-2">
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
