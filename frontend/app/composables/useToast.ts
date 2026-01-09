// Toast composable for global notifications
interface Toast {
  id: number
  variant: 'default' | 'success' | 'error' | 'warning' | 'info'
  title?: string
  description?: string
  duration?: number
}

interface ToastOptions {
  title?: string
  description?: string
  duration?: number
}

const toasts = ref<Toast[]>([])
let toastId = 0

export const useToast = () => {
  const addToast = (variant: Toast['variant'], options: ToastOptions | string): number => {
    const id = ++toastId
    const toast: Toast = {
      id,
      variant,
      ...(typeof options === 'string' ? { title: options } : options),
    }
    
    toasts.value.push(toast)
    
    // Auto remove after duration
    const duration = toast.duration ?? 5000
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
    
    return id
  }

  const removeToast = (id: number) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  const clearAll = () => {
    toasts.value = []
  }

  return {
    toasts: readonly(toasts),
    toast: {
      default: (options: ToastOptions | string) => addToast('default', options),
      success: (options: ToastOptions | string) => addToast('success', options),
      error: (options: ToastOptions | string) => addToast('error', options),
      warning: (options: ToastOptions | string) => addToast('warning', options),
      info: (options: ToastOptions | string) => addToast('info', options),
    },
    removeToast,
    clearAll,
  }
}
