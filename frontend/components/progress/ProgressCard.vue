<script setup lang="ts">
import type { StudentProgress } from '~/stores/progress'

const props = defineProps<{
  progress: StudentProgress
}>()

const getEngagementColor = (score: number) => {
  if (score >= 80) return 'text-green-500'
  if (score >= 60) return 'text-blue-500'
  if (score >= 40) return 'text-yellow-500'
  return 'text-red-500'
}

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} phút`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}
</script>

<template>
  <div class="rounded-lg border bg-card p-6 shadow-sm">
    <h3 class="text-lg font-semibold mb-6">Tiến độ học tập</h3>

    <!-- Stats grid -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="p-4 rounded-lg bg-blue-500/10 text-center">
        <div class="text-2xl font-bold text-blue-500">{{ progress.totalActivities }}</div>
        <div class="text-xs text-muted-foreground">Hoạt động</div>
      </div>
      
      <div class="p-4 rounded-lg bg-green-500/10 text-center">
        <div class="text-2xl font-bold text-green-500">{{ formatDuration(progress.totalTimeMinutes) }}</div>
        <div class="text-xs text-muted-foreground">Thời gian học</div>
      </div>
      
      <div class="p-4 rounded-lg bg-purple-500/10 text-center">
        <div class="text-2xl font-bold text-purple-500">{{ progress.assignmentsCompleted }}</div>
        <div class="text-xs text-muted-foreground">Bài tập hoàn thành</div>
      </div>
      
      <div class="p-4 rounded-lg bg-orange-500/10 text-center">
        <div class="text-2xl font-bold text-orange-500">{{ progress.sessionsAttended }}</div>
        <div class="text-xs text-muted-foreground">Buổi học tham gia</div>
      </div>
    </div>

    <!-- Engagement Score -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium">Điểm tích cực</span>
        <span :class="['text-lg font-bold', getEngagementColor(progress.engagementScore)]">
          {{ progress.engagementScore }}%
        </span>
      </div>
      <div class="h-3 bg-muted rounded-full overflow-hidden">
        <div 
          class="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500"
          :style="{ width: `${progress.engagementScore}%` }"
        />
      </div>
    </div>

    <!-- Activity breakdown -->
    <div class="grid grid-cols-2 gap-4">
      <div class="p-3 rounded-lg border border-border">
        <div class="flex items-center gap-2 mb-2">
          <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span class="text-sm font-medium">Tài liệu đã xem</span>
        </div>
        <div class="text-2xl font-bold">{{ progress.materialsViewed }}</div>
      </div>
      
      <div class="p-3 rounded-lg border border-border">
        <div class="flex items-center gap-2 mb-2">
          <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-sm font-medium">Quiz hoàn thành</span>
        </div>
        <div class="text-2xl font-bold">{{ progress.quizzesCompleted }}</div>
      </div>
    </div>

    <!-- Last activity -->
    <div v-if="progress.lastActivityAt" class="mt-4 pt-4 border-t text-sm text-muted-foreground">
      Hoạt động gần nhất: {{ new Date(progress.lastActivityAt).toLocaleString('vi-VN') }}
    </div>
  </div>
</template>
