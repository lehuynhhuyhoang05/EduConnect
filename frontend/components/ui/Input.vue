<script setup lang="ts">
import { computed, type InputHTMLAttributes } from 'vue'

interface Props extends /* @vue-ignore */ InputHTMLAttributes {
  modelValue?: string | number
  type?: string
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
  hint?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', String(value)),
})

const inputClasses = computed(() => [
  'flex h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background',
  'file:border-0 file:bg-transparent file:text-sm file:font-medium',
  'placeholder:text-muted-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  'disabled:cursor-not-allowed disabled:opacity-50',
  props.error ? 'border-destructive focus-visible:ring-destructive' : 'border-input',
])
</script>

<template>
  <div class="space-y-2">
    <label v-if="label" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
      {{ label }}
    </label>
    <input
      v-model="inputValue"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="inputClasses"
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
