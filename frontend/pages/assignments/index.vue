<script setup lang="ts">
const authStore = useAuthStore()
const assignmentsStore = useAssignmentsStore()
const { toast } = useToast()

const isLoading = ref(true)
const searchQuery = ref('')
const filterStatus = ref<'all' | 'pending' | 'submitted' | 'graded'>('all')

const filteredAssignments = computed(() => {
  let assignments = assignmentsStore.assignments

  // Filter by status
  if (filterStatus.value === 'pending') {
    assignments = assignments.filter(a => !a.submission)
  } else if (filterStatus.value === 'submitted') {
    assignments = assignments.filter(a => a.submission && !a.submission.grade)
  } else if (filterStatus.value === 'graded') {
    assignments = assignments.filter(a => a.submission?.grade !== undefined)
  }

  // Filter by search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    assignments = assignments.filter(
      a => a.title.toLowerCase().includes(query) ||
           a.class?.name.toLowerCase().includes(query)
    )
  }

  return assignments
})

const getStatusBadge = (assignment: any) => {
  if (assignment.submission?.grade !== undefined) {
    return { label: 'Đã chấm', variant: 'success' }
  }
  if (assignment.submission) {
    return { label: 'Đã nộp', variant: 'info' }
  }
  if (new Date(assignment.dueDate) < new Date()) {
    return { label: 'Quá hạn', variant: 'destructive' }
  }
  return { label: 'Chưa nộp', variant: 'warning' }
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
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Bài tập</h1>
        <p class="text-muted-foreground">
          {{ authStore.isTeacher ? 'Quản lý và chấm điểm bài tập' : 'Xem và nộp bài tập' }}
        </p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-col gap-4 md:flex-row md:items-center">
      <div class="relative flex-1">
        <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Tìm kiếm bài tập..."
          class="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm"
        />
      </div>
      <div class="flex gap-2">
        <button
          v-for="filter in [
            { value: 'all', label: 'Tất cả' },
            { value: 'pending', label: 'Chưa nộp' },
            { value: 'submitted', label: 'Đã nộp' },
            { value: 'graded', label: 'Đã chấm' },
          ]"
          :key="filter.value"
          class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          :class="filterStatus === filter.value ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'"
          @click="filterStatus = filter.value as any"
        >
          {{ filter.label }}
        </button>
      </div>
    </div>

    <!-- Assignments List -->
    <div v-if="isLoading" class="space-y-4">
      <UiCard v-for="i in 5" :key="i">
        <UiCardContent class="p-6">
          <UiSkeleton class="mb-2 h-6 w-3/4" />
          <UiSkeleton class="h-4 w-1/2" />
        </UiCardContent>
      </UiCard>
    </div>

    <div v-else-if="filteredAssignments.length === 0" class="py-12 text-center">
      <svg class="mx-auto h-16 w-16 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <h3 class="mt-4 text-lg font-semibold">Không có bài tập nào</h3>
      <p class="mt-1 text-muted-foreground">
        {{ searchQuery ? 'Không tìm thấy bài tập phù hợp' : 'Bạn chưa có bài tập nào' }}
      </p>
    </div>

    <div v-else class="space-y-4">
      <NuxtLink
        v-for="assignment in filteredAssignments"
        :key="assignment.id"
        :to="`/assignments/${assignment.id}`"
      >
        <UiCard class="transition-shadow hover:shadow-md">
          <UiCardContent class="p-6">
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <h3 class="font-semibold">{{ assignment.title }}</h3>
                  <UiBadge :variant="getStatusBadge(assignment).variant as any">
                    {{ getStatusBadge(assignment).label }}
                  </UiBadge>
                </div>
                <p class="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {{ assignment.description || 'Không có mô tả' }}
                </p>
                <div class="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span class="flex items-center gap-1">
                    <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                    {{ assignment.class?.name }}
                  </span>
                  <span class="flex items-center gap-1">
                    <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Hạn: {{ new Date(assignment.dueDate).toLocaleDateString('vi-VN') }}
                  </span>
                  <span v-if="assignment.maxScore" class="flex items-center gap-1">
                    <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    {{ assignment.maxScore }} điểm
                  </span>
                </div>
              </div>
              <div v-if="assignment.submission?.grade !== undefined" class="text-right">
                <p class="text-2xl font-bold text-primary">{{ assignment.submission.grade }}</p>
                <p class="text-xs text-muted-foreground">/ {{ assignment.maxScore }}</p>
              </div>
            </div>
          </UiCardContent>
        </UiCard>
      </NuxtLink>
    </div>
  </div>
</template>
