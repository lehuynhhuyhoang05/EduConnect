<template>
  <div
    class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden"
  >
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead
          class="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600"
        >
          <tr>
            <th v-for="i in columns" :key="i" class="px-6 py-4 text-left">
              <div
                class="w-24 h-4 rounded bg-gray-200 dark:bg-gray-600 animate-pulse"
              />
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="i in rows" :key="i">
            <td v-for="j in columns" :key="j" class="px-6 py-4">
              <div
                class="h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse"
                :style="{ width: `${60 + Math.random() * 40}%` }"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ rows?: number; columns?: number }>(), {
  rows: 5,
  columns: 6,
});
</script>
