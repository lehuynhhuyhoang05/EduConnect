<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const authStore = useAuthStore()
const classesStore = useClassesStore()
const progressStore = useProgressStore()
const { toast } = useToast()

const classId = computed(() => Number(route.params.id))
const isLoading = ref(true)
const selectedStudent = ref<number | null>(null)

const currentClass = computed(() => classesStore.currentClass)
const isTeacher = computed(() => currentClass.value?.teacherId === authStore.user?.id)

// Students for dropdown (teacher only)
const students = ref<{ id: number; fullName: string }[]>([])

onMounted(async () => {
  try {
    if (!classesStore.currentClass || classesStore.currentClass.id !== classId.value) {
      await classesStore.fetchClass(classId.value)
    }
    
    if (isTeacher.value) {
      // Teacher: load class members and leaderboard
      await classesStore.fetchMembers(classId.value)
      const members = classesStore.members || []
      students.value = members
        .filter((m: any) => m.role === 'STUDENT')
        .map((m: any) => ({
          id: m.userId || m.user?.id || m.id,
          fullName: m.user?.fullName || m.fullName || 'Học sinh',
        }))
      
      await progressStore.fetchLeaderboard(classId.value)
    } else {
      // Student: load own progress
      await progressStore.fetchMyProgress(classId.value)
      await progressStore.fetchActivityChart(classId.value)
    }
  } catch (error) {
    toast.error('Không thể tải dữ liệu tiến độ')
  } finally {
    isLoading.value = false
  }
})

const loadStudentProgress = async (studentId: number) => {
  selectedStudent.value = studentId
  await progressStore.fetchStudentProgress(studentId, classId.value)
  await progressStore.fetchActivityChart(classId.value, studentId)
}

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} phút`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

const getEngagementColor = (score: number) => {
  if (score >= 80) return 'text-green-500'
  if (score >= 60) return 'text-blue-500'
  if (score >= 40) return 'text-yellow-500'
  return 'text-red-500'
}

const getMedalEmoji = (rank: number) => {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return ''
}
</script>

<template>
  <div class="max-w-5xl mx-auto py-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <NuxtLink :to="`/classes/${classId}`">
          <button class="p-2 rounded-lg hover:bg-gray-100 transition">
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
        </NuxtLink>
        <div>
          <h1 class="text-2xl font-bold">Tiến độ học tập</h1>
          <p class="text-gray-500">{{ currentClass?.name }}</p>
        </div>
      </div>
      
      <!-- Student selector for teachers -->
      <div v-if="isTeacher && students.length > 0" class="flex items-center gap-2">
        <span class="text-sm text-gray-500">Xem học sinh:</span>
        <select 
          v-model="selectedStudent"
          @change="selectedStudent && loadStudentProgress(selectedStudent)"
          class="px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option :value="null">Chọn học sinh...</option>
          <option v-for="student in students" :key="student.id" :value="student.id">
            {{ student.fullName }}
          </option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-4">
      <div class="h-40 bg-gray-100 rounded-2xl animate-pulse" />
      <div class="h-64 bg-gray-100 rounded-2xl animate-pulse" />
    </div>

    <template v-else>
      <!-- Student View or Selected Student View -->
      <template v-if="!isTeacher || selectedStudent">
        <div v-if="progressStore.currentProgress" class="space-y-6">
          <!-- Stats Card -->
          <div class="bg-white rounded-2xl shadow-sm p-6">
            <h3 class="text-lg font-semibold mb-6">Thống kê học tập</h3>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div class="p-4 rounded-xl bg-blue-500/10 text-center">
                <div class="text-2xl font-bold text-blue-500">{{ progressStore.currentProgress.totalActivities }}</div>
                <div class="text-xs text-gray-500">Hoạt động</div>
              </div>
              
              <div class="p-4 rounded-xl bg-green-500/10 text-center">
                <div class="text-2xl font-bold text-green-500">{{ formatDuration(progressStore.currentProgress.totalTimeMinutes) }}</div>
                <div class="text-xs text-gray-500">Thời gian học</div>
              </div>
              
              <div class="p-4 rounded-xl bg-purple-500/10 text-center">
                <div class="text-2xl font-bold text-purple-500">{{ progressStore.currentProgress.assignmentsCompleted }}</div>
                <div class="text-xs text-gray-500">Bài tập hoàn thành</div>
              </div>
              
              <div class="p-4 rounded-xl bg-orange-500/10 text-center">
                <div class="text-2xl font-bold text-orange-500">{{ progressStore.currentProgress.sessionsAttended }}</div>
                <div class="text-xs text-gray-500">Buổi học tham gia</div>
              </div>
            </div>

            <!-- Engagement Score -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium">Điểm tích cực</span>
                <span :class="['text-lg font-bold', getEngagementColor(progressStore.currentProgress.engagementScore)]">
                  {{ progressStore.currentProgress.engagementScore }}%
                </span>
              </div>
              <div class="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  class="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500"
                  :style="{ width: `${progressStore.currentProgress.engagementScore}%` }"
                />
              </div>
            </div>
          </div>

          <!-- Activity Chart -->
          <div v-if="progressStore.activityChart.length > 0" class="bg-white rounded-2xl shadow-sm p-6">
            <h3 class="text-lg font-semibold mb-4">Hoạt động 30 ngày qua</h3>
            <div class="flex items-end gap-1 h-40">
              <div 
                v-for="day in progressStore.activityChart" 
                :key="day.date"
                class="flex-1 bg-primary/20 hover:bg-primary/40 rounded-t transition cursor-pointer group relative"
                :style="{ height: `${(day.count / Math.max(...progressStore.activityChart.map(d => d.count), 1)) * 100}%`, minHeight: '4px' }"
              >
                <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  {{ new Date(day.date).toLocaleDateString('vi-VN') }}: {{ day.count }} hoạt động
                </div>
              </div>
            </div>
            <div class="flex justify-between mt-2 text-xs text-gray-500">
              <span>30 ngày trước</span>
              <span>Hôm nay</span>
            </div>
          </div>
        </div>

        <div v-else class="bg-white rounded-2xl shadow-sm p-12 text-center">
          <div class="text-6xl mb-4">📊</div>
          <h3 class="text-xl font-semibold mb-2">Chưa có dữ liệu</h3>
          <p class="text-gray-500">Bắt đầu học để theo dõi tiến độ của bạn</p>
        </div>
      </template>

      <!-- Teacher View: Leaderboard -->
      <template v-if="isTeacher && !selectedStudent">
        <div class="bg-white rounded-2xl shadow-sm p-6">
          <h3 class="text-lg font-semibold mb-4">🏆 Bảng xếp hạng lớp</h3>
          
          <div v-if="progressStore.leaderboard.length === 0" class="py-12 text-center text-gray-500">
            <p>Chưa có dữ liệu xếp hạng</p>
            <p class="text-sm">Học sinh cần tham gia hoạt động để xuất hiện ở đây</p>
          </div>
          
          <div v-else class="space-y-3">
            <div
              v-for="entry in progressStore.leaderboard"
              :key="entry.userId"
              class="flex items-center gap-4 p-4 rounded-xl border transition hover:bg-gray-50 cursor-pointer"
              :class="entry.rank <= 3 ? 'border-yellow-200 bg-yellow-50/50' : 'border-gray-200'"
              @click="loadStudentProgress(entry.userId)"
            >
              <!-- Rank -->
              <div class="w-12 text-center">
                <span v-if="entry.rank <= 3" class="text-3xl">{{ getMedalEmoji(entry.rank) }}</span>
                <span v-else class="text-xl font-bold text-gray-400">#{{ entry.rank }}</span>
              </div>
              
              <!-- Avatar -->
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-medium">
                {{ entry.fullName?.charAt(0) || '?' }}
              </div>
              
              <!-- Info -->
              <div class="flex-1">
                <div class="font-semibold">{{ entry.fullName || 'Học sinh' }}</div>
                <div class="text-sm text-gray-500">
                  {{ entry.totalActivities }} hoạt động • {{ formatDuration(entry.totalTimeMinutes) }}
                </div>
              </div>
              
              <!-- Score -->
              <div class="text-right">
                <div :class="['text-2xl font-bold', getEngagementColor(entry.engagementScore)]">
                  {{ entry.engagementScore }}%
                </div>
                <div class="text-xs text-gray-500">Điểm tích cực</div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-blue-50 rounded-2xl p-4 text-center text-blue-700">
          <p class="text-sm">💡 Nhấn vào học sinh để xem chi tiết tiến độ</p>
        </div>
      </template>
    </template>
  </div>
</template>
