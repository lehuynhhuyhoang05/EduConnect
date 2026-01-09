<script setup lang="ts">
import { computed, type TextareaHTMLAttributes } from 'vue'

interface Props extends /* @vue-ignore */ TextareaHTMLAttributes {
  modelValue?: string
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
  hint?: string
  rows?: number
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  rows: 3,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', String(value)),
})

const textareaClasses = computed(() => [
  'flex min-h-[80px] w-full rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background',
  'placeholder:text-muted-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'resize-none',
  props.error ? 'border-destructive focus-visible:ring-destructive' : 'border-input',
])
</script>

<template>
  <div class="space-y-2">
    <label v-if="label" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
      {{ label }}
    </label>
    <textarea
      v-model="inputValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :rows="rows"
      :class="textareaClasses"
      v-bind="$attrs"
    />
    <p v-if="error" class="text-sm text-destructive">
      {{ error }}
    </p>
    <p v-else-if="hint" class="text-sm text-muted-foreground">
      {{ hint }}
    </p>
  </div>
</template>
