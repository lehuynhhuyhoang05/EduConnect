<script setup lang="ts">
const toasts = ref<Array<{
  id: number
  variant: 'default' | 'success' | 'error' | 'warning' | 'info'
  title?: string
  description?: string
  duration?: number
}>>([])

let toastId = 0

const addToast = (toast: Omit<typeof toasts.value[0], 'id'>) => {
  const id = ++toastId
  toasts.value.push({ ...toast, id })
  return id
}

const removeToast = (id: number) => {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index !== -1) {
    toasts.value.splice(index, 1)
  }
}

// Provide global toast function
const toast = {
  default: (title: string, description?: string) => addToast({ variant: 'default', title, description }),
  success: (title: string, description?: string) => addToast({ variant: 'success', title, description }),
  error: (title: string, description?: string) => addToast({ variant: 'error', title, description }),
  warning: (title: string, description?: string) => addToast({ variant: 'warning', title, description }),
  info: (title: string, description?: string) => addToast({ variant: 'info', title, description }),
}

provide('toast', toast)

// Expose globally via composable
defineExpose({ toast, addToast, removeToast })
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
      <TransitionGroup
        enter-active-class="transition-all duration-300"
        enter-from-class="translate-x-full opacity-0"
        enter-to-class="translate-x-0 opacity-100"
        leave-active-class="transition-all duration-200"
        leave-from-class="translate-x-0 opacity-100"
        leave-to-class="translate-x-full opacity-0"
      >
        <UiToast
          v-for="t in toasts"
          :key="t.id"
          :variant="t.variant"
          :title="t.title"
          :description="t.description"
          :duration="t.duration"
          @close="removeToast(t.id)"
        />
      </TransitionGroup>
    </div>
  </Teleport>
</template>
