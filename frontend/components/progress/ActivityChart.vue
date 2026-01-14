<script setup lang="ts">
import type { DailyActivity } from '~/stores/progress'

const props = defineProps<{
  data: DailyActivity[]
}>()

const maxActivity = computed(() => 
  Math.max(...props.data.map(d => d.count), 1)
)

const chartHeight = 200
const chartWidth = 700

const points = computed(() => {
  if (props.data.length === 0) return ''
  
  const xStep = chartWidth / (props.data.length - 1 || 1)
  
  return props.data.map((d, i) => {
    const x = i * xStep
    const y = chartHeight - (d.count / maxActivity.value) * chartHeight
    return `${x},${y}`
  }).join(' ')
})

const areaPath = computed(() => {
  if (props.data.length === 0) return ''
  
  const xStep = chartWidth / (props.data.length - 1 || 1)
  
  let path = `M 0 ${chartHeight}`
  
  props.data.forEach((d, i) => {
    const x = i * xStep
    const y = chartHeight - (d.count / maxActivity.value) * chartHeight
    path += ` L ${x} ${y}`
  })
  
  path += ` L ${chartWidth} ${chartHeight} Z`
  
  return path
})

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}
</script>

<template>
  <div class="rounded-lg border bg-card p-6 shadow-sm">
    <h3 class="text-lg font-semibold mb-4">Hoạt động 30 ngày qua</h3>
    
    <div v-if="data.length > 0" class="overflow-x-auto">
      <svg :viewBox="`0 0 ${chartWidth} ${chartHeight + 40}`" class="w-full min-w-[600px]">
        <!-- Grid lines -->
        <line 
          v-for="i in 5" 
          :key="i"
          x1="0" 
          :y1="(i - 1) * chartHeight / 4"
          :x2="chartWidth"
          :y2="(i - 1) * chartHeight / 4"
          stroke="currentColor"
          stroke-opacity="0.1"
        />
        
        <!-- Area fill -->
        <path 
          :d="areaPath"
          fill="url(#gradient)"
          opacity="0.3"
        />
        
        <!-- Line -->
        <polyline
          :points="points"
          fill="none"
          stroke="hsl(var(--primary))"
          stroke-width="2"
          stroke-linejoin="round"
        />
        
        <!-- Data points -->
        <circle
          v-for="(d, i) in data"
          :key="i"
          :cx="i * (chartWidth / (data.length - 1 || 1))"
          :cy="chartHeight - (d.count / maxActivity) * chartHeight"
          r="4"
          fill="hsl(var(--primary))"
          class="hover:r-6 transition-all"
        >
          <title>{{ formatDate(d.date) }}: {{ d.count }} hoạt động, {{ d.minutes }} phút</title>
        </circle>
        
        <!-- X-axis labels -->
        <text
          v-for="(d, i) in data.filter((_, idx) => idx % Math.ceil(data.length / 7) === 0)"
          :key="i"
          :x="data.indexOf(d) * (chartWidth / (data.length - 1 || 1))"
          :y="chartHeight + 25"
          text-anchor="middle"
          class="text-xs fill-muted-foreground"
        >
          {{ formatDate(d.date) }}
        </text>
        
        <!-- Gradient definition -->
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="hsl(var(--primary))" />
            <stop offset="100%" stop-color="hsl(var(--primary))" stop-opacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
    
    <div v-else class="h-48 flex items-center justify-center text-muted-foreground">
      Chưa có dữ liệu hoạt động
    </div>
    
    <!-- Stats summary -->
    <div v-if="data.length > 0" class="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
      <div class="text-center">
        <div class="text-lg font-bold">{{ data.reduce((sum, d) => sum + d.count, 0) }}</div>
        <div class="text-xs text-muted-foreground">Tổng hoạt động</div>
      </div>
      <div class="text-center">
        <div class="text-lg font-bold">{{ data.reduce((sum, d) => sum + d.minutes, 0) }}</div>
        <div class="text-xs text-muted-foreground">Tổng phút</div>
      </div>
      <div class="text-center">
        <div class="text-lg font-bold">{{ (data.reduce((sum, d) => sum + d.count, 0) / data.length).toFixed(1) }}</div>
        <div class="text-xs text-muted-foreground">TB/ngày</div>
      </div>
    </div>
  </div>
</template>
