<script setup lang="ts">
import type { PollResults } from '~/stores/polls'

const props = defineProps<{
  results: PollResults
  showAnswers?: boolean
}>()

const maxVotes = computed(() => 
  Math.max(...props.results.options.map(o => o.count), 1)
)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between text-sm text-muted-foreground">
      <span>Tổng số phản hồi: {{ results.totalResponses }}</span>
    </div>

    <div class="space-y-3">
      <div v-for="option in results.options" :key="option.index" class="space-y-1">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium">{{ option.text }}</span>
          <span class="text-sm text-muted-foreground">
            {{ option.count }} ({{ option.percentage.toFixed(1) }}%)
          </span>
        </div>
        <div class="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            class="h-full bg-primary rounded-full transition-all duration-500"
            :style="{ width: `${(option.count / maxVotes) * 100}%` }"
          />
        </div>
      </div>
    </div>

    <!-- Show correct answers for quiz -->
    <div v-if="showAnswers" class="mt-4 p-3 bg-green-500/10 rounded-lg">
      <p class="text-sm font-medium text-green-600">Đáp án đúng được đánh dấu ✓</p>
    </div>
  </div>
</template>
