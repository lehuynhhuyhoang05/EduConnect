<script setup lang="ts">
import type { LeaderboardEntry } from '~/stores/progress'

const props = defineProps<{
  entries: LeaderboardEntry[]
  currentUserId?: number
}>()

const getMedalEmoji = (rank: number) => {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return ''
}

const getRankBg = (rank: number) => {
  if (rank === 1) return 'bg-yellow-500/20 border-yellow-500'
  if (rank === 2) return 'bg-gray-400/20 border-gray-400'
  if (rank === 3) return 'bg-orange-400/20 border-orange-400'
  return 'bg-muted border-border'
}
</script>

<template>
  <div class="rounded-lg border bg-card p-6 shadow-sm">
    <h3 class="text-lg font-semibold mb-4">🏆 Bảng xếp hạng</h3>
    
    <div class="space-y-3">
      <div
        v-for="entry in entries"
        :key="entry.userId"
        :class="[
          'flex items-center gap-4 p-3 rounded-lg border transition',
          getRankBg(entry.rank),
          entry.userId === currentUserId && 'ring-2 ring-primary'
        ]"
      >
        <!-- Rank -->
        <div class="w-10 text-center">
          <span v-if="entry.rank <= 3" class="text-2xl">{{ getMedalEmoji(entry.rank) }}</span>
          <span v-else class="text-lg font-bold text-muted-foreground">#{{ entry.rank }}</span>
        </div>
        
        <!-- User info -->
        <div class="flex-1">
          <div class="font-medium flex items-center gap-2">
            {{ entry.fullName }}
            <span v-if="entry.userId === currentUserId" class="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
              Bạn
            </span>
          </div>
          <div class="text-xs text-muted-foreground">
            {{ entry.totalActivities }} hoạt động • {{ entry.totalTimeMinutes }} phút
          </div>
        </div>
        
        <!-- Score -->
        <div class="text-right">
          <div class="text-xl font-bold text-primary">{{ entry.engagementScore }}%</div>
          <div class="text-xs text-muted-foreground">Điểm tích cực</div>
        </div>
      </div>
    </div>
    
    <div v-if="entries.length === 0" class="py-8 text-center text-muted-foreground">
      Chưa có dữ liệu xếp hạng
    </div>
  </div>
</template>
