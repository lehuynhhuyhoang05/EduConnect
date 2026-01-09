<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const classesStore = useClassesStore()
const assignmentsStore = useAssignmentsStore()
const liveSessionsStore = useLiveSessionsStore()
const { toast } = useToast()

const classId = computed(() => Number(route.params.id))
const isLoading = ref(true)
const activeTab = ref('stream')

const currentClass = computed(() => classesStore.currentClass)
const isTeacher = computed(() => currentClass.value?.teacherId === authStore.user?.id)

const tabs = computed(() => {
  const baseTabs = [
    { id: 'stream', label: 'Bảng tin', icon: 'newspaper' },
    { id: 'assignments', label: 'Bài tập', icon: 'clipboard' },
    { id: 'materials', label: 'Tài liệu', icon: 'folder' },
    { id: 'members', label: 'Thành viên', icon: 'users' },
  ]

  if (isTeacher.value) {
    baseTabs.push({ id: 'settings', label: 'Cài đặt', icon: 'cog' })
  }

  return baseTabs
})

const getIconPath = (icon: string) => {
  const icons: Record<string, string> = {
    'newspaper': 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z',
    'clipboard': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    'folder': 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
    'users': 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    'cog': 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  }
  return icons[icon] || ''
}

const showCodeDialog = ref(false)
const copyCode = async () => {
  if (currentClass.value?.code) {
    await navigator.clipboard.writeText(currentClass.value.code)
    toast.success('Đã sao chép mã lớp!')
  }
}

const startLiveSession = async () => {
  try {
    const session = await liveSessionsStore.createSession({
      classId: classId.value,
      title: `Buổi học - ${new Date().toLocaleDateString('vi-VN')}`,
    })
    router.push(`/live/${session.id}`)
  } catch (error: any) {
    toast.error('Không thể bắt đầu buổi học', error.message)
  }
}

onMounted(async () => {
  try {
    await classesStore.fetchClass(classId.value)
    await Promise.all([
      assignmentsStore.fetchAssignments({ classId: classId.value }),
      liveSessionsStore.fetchSessions({ classId: classId.value }),
    ])
  } catch (error) {
    toast.error('Không thể tải thông tin lớp học')
    router.push('/classes')
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div v-if="isLoading" class="space-y-6">
    <UiSkeleton class="h-48 w-full" variant="rounded" />
    <div class="flex gap-4">
      <UiSkeleton v-for="i in 4" :key="i" class="h-10 w-24" variant="rounded" />
    </div>
    <UiSkeleton class="h-64 w-full" variant="rounded" />
  </div>

  <div v-else-if="currentClass" class="space-y-6">
    <!-- Header Banner -->
    <div class="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary/60 p-6 text-primary-foreground">
      <div class="relative z-10">
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-2xl font-bold">{{ currentClass.name }}</h1>
            <p class="mt-1 opacity-90">{{ currentClass.description || 'Không có mô tả' }}</p>
            <div class="mt-4 flex items-center gap-4 text-sm">
              <div class="flex items-center gap-2">
                <UiAvatar
                  :src="currentClass.teacher?.avatarUrl"
                  :alt="currentClass.teacher?.fullName"
                  size="sm"
                />
                <span>{{ currentClass.teacher?.fullName }}</span>
              </div>
              <span>•</span>
              <span>{{ currentClass.memberCount }} thành viên</span>
            </div>
          </div>
          
          <div class="flex gap-2">
            <UiButton
              v-if="isTeacher"
              variant="secondary"
              @click="showCodeDialog = true"
            >
              <svg class="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              </svg>
              Mã lớp
            </UiButton>
            <UiButton
              v-if="isTeacher"
              variant="secondary"
              @click="startLiveSession"
            >
              <svg class="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Bắt đầu Live
            </UiButton>
          </div>
        </div>
      </div>
      
      <!-- Background Pattern -->
      <div class="absolute inset-0 opacity-10">
        <svg class="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" stroke-width="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
    </div>

    <!-- Active Live Session Banner -->
    <div
      v-if="liveSessionsStore.activeSessions.some(s => s.classId === classId)"
      class="rounded-lg border border-green-500/20 bg-green-500/10 p-4"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="relative flex h-3 w-3">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
            <span class="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
          </span>
          <div>
            <p class="font-medium text-green-700 dark:text-green-300">Buổi học đang diễn ra</p>
            <p class="text-sm text-green-600 dark:text-green-400">
              {{ liveSessionsStore.activeSessions.find(s => s.classId === classId)?.title }}
            </p>
          </div>
        </div>
        <NuxtLink :to="`/live/${liveSessionsStore.activeSessions.find(s => s.classId === classId)?.id}`">
          <UiButton>
            Tham gia ngay
          </UiButton>
        </NuxtLink>
      </div>
    </div>

    <!-- Tabs -->
    <div class="border-b">
      <nav class="-mb-px flex gap-4">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors"
          :class="activeTab === tab.id
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'"
          @click="activeTab = tab.id"
        >
          <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" :d="getIconPath(tab.icon)" />
          </svg>
          {{ tab.label }}
        </button>
      </nav>
    </div>

    <!-- Tab Content -->
    <div>
      <!-- Stream Tab -->
      <div v-if="activeTab === 'stream'" class="space-y-6">
        <UiCard v-if="isTeacher">
          <UiCardContent class="p-4">
            <div class="flex items-center gap-4">
              <UiAvatar
                :src="authStore.user?.avatarUrl"
                :alt="authStore.user?.fullName"
                size="md"
              />
              <input
                type="text"
                placeholder="Thông báo cho lớp học..."
                class="flex-1 rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </UiCardContent>
        </UiCard>

        <div class="py-8 text-center text-muted-foreground">
          <svg class="mx-auto h-12 w-12 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <p class="mt-2">Chưa có bài đăng nào</p>
        </div>
      </div>

      <!-- Assignments Tab -->
      <div v-else-if="activeTab === 'assignments'" class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">Bài tập</h3>
          <NuxtLink v-if="isTeacher" :to="`/classes/${classId}/assignments/create`">
            <UiButton size="sm">
              <svg class="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 4v16m8-8H4" />
              </svg>
              Tạo bài tập
            </UiButton>
          </NuxtLink>
        </div>

        <div v-if="assignmentsStore.assignments.length === 0" class="py-8 text-center text-muted-foreground">
          <p>Chưa có bài tập nào</p>
        </div>

        <UiCard v-for="assignment in assignmentsStore.assignments" :key="assignment.id">
          <UiCardContent class="p-4">
            <NuxtLink :to="`/assignments/${assignment.id}`" class="block">
              <div class="flex items-start justify-between">
                <div>
                  <h4 class="font-medium hover:text-primary">{{ assignment.title }}</h4>
                  <p class="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {{ assignment.description || 'Không có mô tả' }}
                  </p>
                  <p class="mt-2 text-xs text-muted-foreground">
                    Hạn nộp: {{ new Date(assignment.dueDate).toLocaleString('vi-VN') }}
                  </p>
                </div>
                <UiBadge :variant="new Date(assignment.dueDate) < new Date() ? 'destructive' : 'secondary'">
                  {{ new Date(assignment.dueDate) < new Date() ? 'Quá hạn' : 'Còn hạn' }}
                </UiBadge>
              </div>
            </NuxtLink>
          </UiCardContent>
        </UiCard>
      </div>

      <!-- Materials Tab -->
      <div v-else-if="activeTab === 'materials'" class="py-8 text-center text-muted-foreground">
        <svg class="mx-auto h-12 w-12 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <p class="mt-2">Chưa có tài liệu nào</p>
        <UiButton v-if="isTeacher" class="mt-4" variant="outline">
          Tải lên tài liệu
        </UiButton>
      </div>

      <!-- Members Tab -->
      <div v-else-if="activeTab === 'members'" class="space-y-4">
        <h3 class="text-lg font-semibold">Thành viên ({{ currentClass.memberCount }})</h3>
        
        <!-- Teacher -->
        <div class="rounded-lg border p-4">
          <p class="mb-2 text-sm font-medium text-muted-foreground">Giáo viên</p>
          <div class="flex items-center gap-3">
            <UiAvatar
              :src="currentClass.teacher?.avatarUrl"
              :alt="currentClass.teacher?.fullName"
              size="md"
            />
            <div>
              <p class="font-medium">{{ currentClass.teacher?.fullName }}</p>
              <p class="text-sm text-muted-foreground">{{ currentClass.teacher?.email }}</p>
            </div>
          </div>
        </div>

        <!-- Students -->
        <div class="rounded-lg border p-4">
          <p class="mb-4 text-sm font-medium text-muted-foreground">
            Học sinh ({{ (currentClass.memberCount || 1) - 1 }})
          </p>
          <div class="space-y-3">
            <p class="text-center text-sm text-muted-foreground">
              Tính năng đang phát triển...
            </p>
          </div>
        </div>
      </div>

      <!-- Settings Tab -->
      <div v-else-if="activeTab === 'settings' && isTeacher" class="space-y-6">
        <UiCard>
          <UiCardHeader title="Cài đặt lớp học" />
          <UiCardContent class="space-y-4">
            <UiInput
              :model-value="currentClass.name"
              label="Tên lớp"
            />
            <UiTextarea
              :model-value="currentClass.description"
              label="Mô tả"
              :rows="3"
            />
            <UiButton>Lưu thay đổi</UiButton>
          </UiCardContent>
        </UiCard>

        <UiCard variant="outline" class="border-destructive/20">
          <UiCardHeader title="Vùng nguy hiểm" />
          <UiCardContent>
            <p class="text-sm text-muted-foreground">
              Xóa lớp học sẽ xóa tất cả dữ liệu liên quan bao gồm bài tập, tài liệu và thông báo.
            </p>
            <UiButton variant="destructive" class="mt-4">
              Xóa lớp học
            </UiButton>
          </UiCardContent>
        </UiCard>
      </div>
    </div>

    <!-- Class Code Dialog -->
    <UiDialog v-model:open="showCodeDialog" title="Mã lớp học">
      <div class="space-y-4">
        <p class="text-sm text-muted-foreground">
          Chia sẻ mã này để học sinh có thể tham gia lớp học
        </p>
        <div class="flex items-center gap-2">
          <div class="flex-1 rounded-lg bg-muted p-4 text-center">
            <span class="font-mono text-3xl font-bold tracking-widest">
              {{ currentClass.code }}
            </span>
          </div>
          <UiButton variant="outline" @click="copyCode">
            <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </UiButton>
        </div>
      </div>
      <template #footer>
        <UiButton variant="outline" @click="showCodeDialog = false">Đóng</UiButton>
      </template>
    </UiDialog>
  </div>
</template>
