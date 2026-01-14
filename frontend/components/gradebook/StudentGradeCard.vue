<script setup lang="ts">
import type { StudentGrades } from '~/stores/gradebook'

const props = defineProps<{
  studentGrades: StudentGrades
}>()

const overallColor = computed(() => {
  const pct = props.studentGrades.overallPercentage
  if (pct >= 90) return 'text-green-500'
  if (pct >= 80) return 'text-blue-500'
  if (pct >= 70) return 'text-yellow-500'
  if (pct >= 60) return 'text-orange-500'
  return 'text-red-500'
})

const getLetterGrade = (percentage: number) => {
  if (percentage >= 90) return 'A'
  if (percentage >= 80) return 'B'
  if (percentage >= 70) return 'C'
  if (percentage >= 60) return 'D'
  return 'F'
}

const categoryTotals = computed(() => {
  const totals: Record<string, { earned: number; possible: number }> = {}
  
  for (const item of props.studentGrades.items) {
    if (!totals[item.category]) {
      totals[item.category] = { earned: 0, possible: 0 }
    }
    totals[item.category].earned += item.points ?? 0
    totals[item.category].possible += item.maxPoints
  }
  
  return totals
})

const categoryLabels: Record<string, string> = {
  assignment: 'Bài tập',
  quiz: 'Quiz',
  exam: 'Kiểm tra',
  project: 'Dự án',
  participation: 'Tham gia',
  other: 'Khác',
}
</script>

<template>
  <div class="rounded-lg border bg-card p-6 shadow-sm">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-lg font-semibold">Bảng điểm của tôi</h3>
      <div class="text-right">
        <div :class="['text-3xl font-bold', overallColor]">
          {{ studentGrades.overallPercentage.toFixed(1) }}%
        </div>
        <div class="text-sm text-muted-foreground">
          Xếp loại: {{ getLetterGrade(studentGrades.overallPercentage) }}
        </div>
      </div>
    </div>

    <!-- Category breakdown -->
    <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
      <div 
        v-for="(total, category) in categoryTotals" 
        :key="category"
        class="p-3 rounded-lg bg-muted"
      >
        <div class="text-xs text-muted-foreground mb-1">
          {{ categoryLabels[category] || category }}
        </div>
        <div class="font-semibold">
          {{ total.earned }}/{{ total.possible }}
        </div>
        <div class="text-xs text-muted-foreground">
          {{ total.possible > 0 ? ((total.earned / total.possible) * 100).toFixed(1) : 0 }}%
        </div>
      </div>
    </div>

    <!-- Individual items -->
    <div class="space-y-3">
      <div 
        v-for="item in studentGrades.items" 
        :key="item.gradeItemId"
        class="flex items-center justify-between p-3 rounded-lg border border-border"
      >
        <div>
          <div class="font-medium">{{ item.name }}</div>
          <div class="text-xs text-muted-foreground capitalize">{{ categoryLabels[item.category] }}</div>
        </div>
        <div class="text-right">
          <div v-if="item.points !== undefined" class="font-semibold">
            {{ item.points }}/{{ item.maxPoints }}
          </div>
          <div v-else class="text-muted-foreground">Chưa có điểm</div>
          <div v-if="item.feedback" class="text-xs text-muted-foreground max-w-[200px] truncate">
            💬 {{ item.feedback }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="studentGrades.items.length === 0" class="text-center py-8 text-muted-foreground">
      Chưa có điểm nào
    </div>
  </div>
</template>
