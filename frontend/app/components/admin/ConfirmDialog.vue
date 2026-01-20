<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click.self="emit('cancel')"
      >
        <div
          class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        >
          <div class="p-6">
            <div class="flex items-start gap-4">
              <div
                :class="[
                  'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0',
                  iconBgClass,
                ]"
              >
                <svg
                  :class="['w-6 h-6', iconClass]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    :d="iconPath"
                  />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">
                  {{ title }}
                </h3>
                <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {{ message }}
                </p>
              </div>
            </div>
          </div>
          <div
            class="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex justify-end gap-3"
          >
            <button
              @click="emit('cancel')"
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
            >
              {{ cancelText }}
            </button>
            <button
              @click="emit('confirm')"
              :class="[
                'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors',
                confirmBtnClass,
              ]"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  show: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "info" | "warning" | "danger";
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: "Xác nhận",
  cancelText: "Hủy",
  type: "info",
});

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const iconPath = computed(() => {
  if (props.type === "danger")
    return "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16";
  if (props.type === "warning")
    return "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z";
  return "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z";
});

const iconBgClass = computed(() => {
  const classes: Record<string, string> = {
    danger: "bg-red-100 dark:bg-red-900/30",
    warning: "bg-amber-100 dark:bg-amber-900/30",
    info: "bg-blue-100 dark:bg-blue-900/30",
  };
  return classes[props.type];
});

const iconClass = computed(() => {
  const classes: Record<string, string> = {
    danger: "text-red-600 dark:text-red-400",
    warning: "text-amber-600 dark:text-amber-400",
    info: "text-blue-600 dark:text-blue-400",
  };
  return classes[props.type];
});

const confirmBtnClass = computed(() => {
  const classes: Record<string, string> = {
    danger: "bg-red-600 hover:bg-red-700",
    warning: "bg-amber-600 hover:bg-amber-700",
    info: "bg-blue-600 hover:bg-blue-700",
  };
  return classes[props.type];
});
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
