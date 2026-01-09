<script setup lang="ts">
const authStore = useAuthStore()
const classesStore = useClassesStore()
const assignmentsStore = useAssignmentsStore()
const liveSessionsStore = useLiveSessionsStore()

const isLoading = ref(true)

// Stats
const stats = computed(() => [
  {
    label: 'Lớp học',
    value: authStore.isTeacher
      ? classesStore.teachingClasses.length
      : classesStore.enrolledClasses.length,
    icon: 'academic-cap',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    label: 'Bài tập',
    value: assignmentsStore.upcomingAssignments.length,
    icon: 'clipboard',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    label: 'Buổi học trực tiếp',
    value: liveSessionsStore.activeSessions.length,
    icon: 'video',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    label: authStore.isTeacher ? 'Học sinh' : 'Điểm trung bình',
    value: authStore.isTeacher ? '125' : '8.5',
    icon: authStore.isTeacher ? 'users' : 'chart',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
])

// Quick actions
const quickActions = computed(() => {
  const actions = []

  if (authStore.isTeacher) {
    actions.push(
      { label: 'Tạo lớp học', href: '/classes/create', icon: 'plus' },
      { label: 'Tạo bài tập', href: '/assignments/create', icon: 'clipboard-plus' },
      { label: 'Bắt đầu live', href: '/live/create', icon: 'video' },
    )
  } else {
    actions.push(
      { label: 'Tham gia lớp', href: '/classes/join', icon: 'plus' },
      { label: 'Xem bài tập', href: '/assignments', icon: 'clipboard' },
      { label: 'Lịch học', href: '/schedule', icon: 'calendar' },
    )
  }

  return actions
})

const getIconPath = (icon: string) => {
  const icons: Record<string, string> = {
    'academic-cap': 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222',
    'clipboard': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
    'video': 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
    'users': 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    'chart': 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    'plus': 'M12 4v16m8-8H4',
    'clipboard-plus': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    'calendar': 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  }
  return icons[icon] || icons['plus']
}

onMounted(async () => {
  try {
    await Promise.all([
      classesStore.fetchClasses(),
      assignmentsStore.fetchAssignments(),
      liveSessionsStore.fetchSessions(),
    ])
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Welcome Section -->
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Xin chào, {{ authStore.user?.fullName }}! 👋
        </h1>
        <p class="text-muted-foreground">
          {{ authStore.isTeacher ? 'Quản lý lớp học và theo dõi tiến độ học sinh của bạn' : 'Theo dõi tiến độ học tập của bạn' }}
        </p>
      </div>
      <div class="flex gap-2">
        <NuxtLink
          v-for="action in quickActions.slice(0, 2)"
          :key="action.label"
          :to="action.href"
        >
          <UiButton variant="outline" size="sm">
            <svg class="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" :d="getIconPath(action.icon)" />
            </svg>
            {{ action.label }}
          </UiButton>
        </NuxtLink>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <UiCard v-for="stat in stats" :key="stat.label">
        <UiCardContent class="p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-muted-foreground">{{ stat.label }}</p>
              <p class="text-2xl font-bold">{{ stat.value }}</p>
            </div>
            <div :class="[stat.bgColor, 'rounded-full p-3']">
              <svg :class="[stat.color, 'h-6 w-6']" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" :d="getIconPath(stat.icon)" />
              </svg>
            </div>
          </div>
        </UiCardContent>
      </UiCard>
    </div>

    <!-- Main Content Grid -->
    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Classes Section -->
      <div class="lg:col-span-2">
        <UiCard>
          <UiCardHeader title="Lớp học của bạn" description="Các lớp học bạn đang tham gia">
            <template #action>
              <NuxtLink to="/classes">
                <UiButton variant="ghost" size="sm">
                  Xem tất cả
                  <svg class="ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </UiButton>
              </NuxtLink>
            </template>
          </UiCardHeader>
          <UiCardContent>
            <div v-if="isLoading" class="space-y-4">
              <UiSkeleton v-for="i in 3" :key="i" class="h-20 w-full" variant="rounded" />
            </div>
            <div v-else-if="classesStore.classes.length === 0" class="py-8 text-center">
              <svg class="mx-auto h-12 w-12 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 14l9-5-9-5-9 5 9 5z" />
                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
              <p class="mt-2 text-muted-foreground">Chưa có lớp học nào</p>
              <NuxtLink :to="authStore.isTeacher ? '/classes/create' : '/classes/join'" class="mt-4 inline-block">
                <UiButton>
                  {{ authStore.isTeacher ? 'Tạo lớp học' : 'Tham gia lớp' }}
                </UiButton>
              </NuxtLink>
            </div>
            <div v-else class="space-y-4">
              <NuxtLink
                v-for="classItem in classesStore.classes.slice(0, 5)"
                :key="classItem.id"
                :to="`/classes/${classItem.id}`"
                class="block rounded-lg border p-4 transition-colors hover:bg-accent"
              >
                <div class="flex items-center gap-4">
                  <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <span class="text-lg font-bold">{{ classItem.name.charAt(0) }}</span>
                  </div>
                  <div class="flex-1">
                    <h4 class="font-medium">{{ classItem.name }}</h4>
                    <p class="text-sm text-muted-foreground">
                      {{ classItem.teacher?.fullName }} • {{ classItem.memberCount }} thành viên
                    </p>
                  </div>
                  <UiBadge v-if="classItem.hasActiveLiveSession" variant="success">
                    LIVE
                  </UiBadge>
                </div>
              </NuxtLink>
            </div>
          </UiCardContent>
        </UiCard>
      </div>

      <!-- Sidebar -->
      <div class="space-y-6">
        <!-- Upcoming Assignments -->
        <UiCard>
          <UiCardHeader title="Bài tập sắp đến hạn" />
          <UiCardContent>
            <div v-if="isLoading" class="space-y-3">
              <UiSkeleton v-for="i in 3" :key="i" class="h-16 w-full" variant="rounded" />
            </div>
            <div v-else-if="assignmentsStore.upcomingAssignments.length === 0" class="py-4 text-center text-sm text-muted-foreground">
              Không có bài tập nào sắp đến hạn
            </div>
            <div v-else class="space-y-3">
              <NuxtLink
                v-for="assignment in assignmentsStore.upcomingAssignments.slice(0, 5)"
                :key="assignment.id"
                :to="`/assignments/${assignment.id}`"
                class="block rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <p class="font-medium">{{ assignment.title }}</p>
                <div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{{ assignment.class?.name }}</span>
                  <span>•</span>
                  <span class="text-orange-500">
                    Hạn: {{ new Date(assignment.dueDate).toLocaleDateString('vi-VN') }}
                  </span>
                </div>
              </NuxtLink>
            </div>
          </UiCardContent>
        </UiCard>

        <!-- Active Live Sessions -->
        <UiCard>
          <UiCardHeader title="Đang diễn ra" />
          <UiCardContent>
            <div v-if="isLoading" class="space-y-3">
              <UiSkeleton v-for="i in 2" :key="i" class="h-16 w-full" variant="rounded" />
            </div>
            <div v-else-if="liveSessionsStore.activeSessions.length === 0" class="py-4 text-center text-sm text-muted-foreground">
              Không có buổi học trực tiếp nào
            </div>
            <div v-else class="space-y-3">
              <NuxtLink
                v-for="session in liveSessionsStore.activeSessions.slice(0, 3)"
                :key="session.id"
                :to="`/live/${session.id}`"
                class="block rounded-lg border border-green-500/20 bg-green-500/5 p-3 transition-colors hover:bg-green-500/10"
              >
                <div class="flex items-center gap-2">
                  <span class="relative flex h-2 w-2">
                    <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                    <span class="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                  </span>
                  <p class="font-medium">{{ session.title }}</p>
                </div>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ session.class?.name }} • {{ session.participantCount }} người tham gia
                </p>
              </NuxtLink>
            </div>
          </UiCardContent>
        </UiCard>
      </div>
    </div>
  </div>
</template>
