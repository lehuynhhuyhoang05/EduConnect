<script setup lang="ts">
import type { Assignment } from '~/types'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const authStore = useAuthStore()
const assignmentsStore = useAssignmentsStore()
const { toast } = useToast()

const isLoading = ref(true)
const searchQuery = ref('')
const filterStatus = ref<'all' | 'pending' | 'submitted' | 'graded'>('all')

const statusCounts = computed(() => {
  const assignments = assignmentsStore.assignments ?? []
  return {
    all: assignments.length,
    pending: assignments.filter((a: Assignment) => !a.submission || a.submission.status === 'returned').length,
    submitted: assignments.filter((a: Assignment) => a.submission && a.submission.status === 'submitted').length,
    graded: assignments.filter((a: Assignment) => a.submission && a.submission.status === 'graded').length,
  }
})

const filteredAssignments = computed(() => {
  let assignments = assignmentsStore.assignments ?? []

  // Filter by status
  if (filterStatus.value === 'pending') {
    assignments = assignments.filter((a: Assignment) => !a.submission || a.submission.status === 'returned')
  } else if (filterStatus.value === 'submitted') {
    assignments = assignments.filter((a: Assignment) => a.submission && a.submission.status === 'submitted')
  } else if (filterStatus.value === 'graded') {
    assignments = assignments.filter((a: Assignment) => a.submission && a.submission.status === 'graded')
  }

  // Filter by search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    assignments = assignments.filter(
      (a: Assignment) => a.title.toLowerCase().includes(query) ||
           a.class?.name.toLowerCase().includes(query)
    )
  }

  return assignments
})

const getStatusInfo = (assignment: Assignment) => {
  if (assignment.submission?.status === 'graded' && assignment.submission?.score !== null && assignment.submission?.score !== undefined) {
    return { 
      label: 'Đã chấm', 
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      iconBg: 'bg-green-500',
    }
  }
  if (assignment.submission && assignment.submission.status === 'submitted') {
    return { 
      label: 'Đã nộp', 
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      iconBg: 'bg-blue-500',
    }
  }
  if (assignment.submission && assignment.submission.status === 'returned') {
    return { 
      label: 'Đã trả lại', 
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-700',
      iconBg: 'bg-yellow-500',
    }
  }
  if (assignment.deadline && new Date(assignment.deadline) < new Date()) {
    return { 
      label: 'Quá hạn', 
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      iconBg: 'bg-red-500',
    }
  }
  return { 
    label: 'Chưa nộp', 
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
    iconBg: 'bg-orange-500',
  }
}

const getDaysRemaining = (dueDate: string) => {
  const now = new Date()
  const due = new Date(dueDate)
  const diff = due.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  
  if (days < 0) return { text: `Quá hạn ${Math.abs(days)} ngày`, urgent: true }
  if (days === 0) return { text: 'Hết hạn hôm nay', urgent: true }
  if (days === 1) return { text: 'Còn 1 ngày', urgent: true }
  if (days <= 3) return { text: `Còn ${days} ngày`, urgent: true }
  return { text: `Còn ${days} ngày`, urgent: false }
}

onMounted(async () => {
  try {
    await assignmentsStore.fetchAssignments()
  } catch (error) {
    toast.error('Không thể tải danh sách bài tập')
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-gradient-to-br from-primary via-primary/90 to-purple-600 text-white">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 class="text-2xl font-bold">Bài tập</h1>
        <p class="text-white/80 mt-1">
          {{ authStore.isTeacher ? 'Quản lý và chấm điểm bài tập' : 'Xem và nộp bài tập của bạn' }}
        </p>

        <!-- Stats -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div class="bg-white/10 backdrop-blur rounded-xl p-4">
            <p class="text-white/70 text-sm">Tổng số</p>
            <p class="text-2xl font-bold mt-1">{{ statusCounts.all }}</p>
          </div>
          <div class="bg-white/10 backdrop-blur rounded-xl p-4">
            <p class="text-white/70 text-sm">Chưa nộp</p>
            <p class="text-2xl font-bold mt-1">{{ statusCounts.pending }}</p>
          </div>
          <div class="bg-white/10 backdrop-blur rounded-xl p-4">
            <p class="text-white/70 text-sm">Đã nộp</p>
            <p class="text-2xl font-bold mt-1">{{ statusCounts.submitted }}</p>
          </div>
          <div class="bg-white/10 backdrop-blur rounded-xl p-4">
            <p class="text-white/70 text-sm">Đã chấm</p>
            <p class="text-2xl font-bold mt-1">{{ statusCounts.graded }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <!-- Filters -->
      <div class="bg-white rounded-2xl shadow-sm p-4 mb-6">
        <div class="flex flex-col sm:flex-row gap-4">
          <!-- Search -->
          <div class="relative flex-1">
            <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Tìm kiếm bài tập..."
              class="w-full h-12 pl-12 pr-4 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <!-- Filter tabs -->
          <div class="flex gap-2 bg-gray-100 p-1.5 rounded-xl">
            <button
              v-for="filter in [
                { value: 'all', label: 'Tất cả' },
                { value: 'pending', label: 'Chưa nộp' },
                { value: 'submitted', label: 'Đã nộp' },
                { value: 'graded', label: 'Đã chấm' },
              ]"
              :key="filter.value"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              :class="filterStatus === filter.value 
                ? 'bg-white text-gray-900 shadow' 
                : 'text-gray-600 hover:text-gray-900'"
              @click="filterStatus = filter.value as any"
            >
              {{ filter.label }}
              <span 
                v-if="statusCounts[filter.value as keyof typeof statusCounts] > 0"
                class="ml-1.5 px-1.5 py-0.5 rounded-full text-xs"
                :class="filterStatus === filter.value ? 'bg-primary/10 text-primary' : 'bg-gray-200'"
              >
                {{ statusCounts[filter.value as keyof typeof statusCounts] }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="space-y-4">
        <div v-for="i in 5" :key="i" class="bg-white rounded-2xl p-6 animate-pulse">
          <div class="flex gap-4">
            <div class="w-14 h-14 rounded-xl bg-gray-200" />
            <div class="flex-1">
              <div class="h-5 w-3/4 bg-gray-200 rounded mb-3" />
              <div class="h-4 w-1/2 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredAssignments.length === 0" class="bg-white rounded-2xl shadow-sm py-16 text-center">
        <div class="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
          <svg class="w-10 h-10 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 class="mt-6 text-lg font-semibold text-gray-900">Không có bài tập nào</h3>
        <p class="mt-2 text-gray-500">
          {{ searchQuery ? 'Không tìm thấy bài tập phù hợp' : 'Bạn chưa có bài tập nào' }}
        </p>
      </div>

      <!-- Assignments List -->
      <div v-else class="space-y-4">
        <NuxtLink
          v-for="assignment in filteredAssignments"
          :key="assignment.id"
          :to="`/assignments/${assignment.id}`"
          class="block bg-white rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden group"
        >
          <div class="p-5">
            <div class="flex items-start gap-4">
              <!-- Status Icon -->
              <div 
                class="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                :class="getStatusInfo(assignment).bgColor"
              >
                <svg class="w-7 h-7" :class="getStatusInfo(assignment).textColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  <path v-if="assignment.submission?.grade !== undefined" d="M9 12l2 2 4-4"/>
                </svg>
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <div class="flex items-center gap-2 flex-wrap">
                      <h3 class="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                        {{ assignment.title }}
                      </h3>
                      <span 
                        class="px-2.5 py-1 rounded-full text-xs font-medium"
                        :class="[getStatusInfo(assignment).bgColor, getStatusInfo(assignment).textColor]"
                      >
                        {{ getStatusInfo(assignment).label }}
                      </span>
                    </div>
                    <p class="text-gray-500 text-sm mt-1 line-clamp-2">
                      {{ assignment.description || 'Không có mô tả' }}
                    </p>
                    
                    <div class="flex flex-wrap items-center gap-4 mt-3 text-sm">
                      <!-- Class -->
                      <span class="flex items-center gap-1.5 text-gray-500">
                        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M12 14l9-5-9-5-9 5 9 5z" />
                          <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                        </svg>
                        {{ assignment.class?.name || 'Không rõ lớp' }}
                      </span>
                      
                      <!-- Due date -->
                      <span 
                        class="flex items-center gap-1.5"
                        :class="getDaysRemaining(assignment.dueDate).urgent ? 'text-red-600' : 'text-gray-500'"
                      >
                        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {{ getDaysRemaining(assignment.dueDate).text }}
                      </span>

                      <!-- Max score -->
                      <span v-if="assignment.maxScore" class="flex items-center gap-1.5 text-gray-500">
                        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        {{ assignment.maxScore }} điểm
                      </span>
                    </div>
                  </div>

                  <!-- Grade (if graded) -->
                  <div v-if="assignment.submission?.grade !== undefined" class="text-right flex-shrink-0">
                    <div class="w-16 h-16 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex flex-col items-center justify-center text-white">
                      <span class="text-xl font-bold">{{ assignment.submission.grade }}</span>
                      <span class="text-xs text-white/70">/ {{ assignment.maxScore }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Arrow -->
              <svg class="w-5 h-5 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 mt-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </div>
          </div>

          <!-- Progress bar for urgency -->
          <div 
            v-if="!assignment.submission && getDaysRemaining(assignment.dueDate).urgent"
            class="h-1 bg-gradient-to-r from-red-500 to-orange-500"
          />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
