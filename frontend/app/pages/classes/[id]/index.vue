<script setup lang="ts">
import type { LiveSession } from '~/types'

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

// New post state
const newPost = ref('')
const isPostingAnnouncement = ref(false)
const announcements = ref<Array<{
  id: number
  content: string
  author: { fullName: string; avatarUrl?: string }
  createdAt: Date
  comments: Array<{ id: number; content: string; author: { fullName: string }; createdAt: Date }>
}>>([
  {
    id: 1,
    content: 'Chào mừng các bạn đến với lớp học! Hãy giới thiệu bản thân ở phần bình luận nhé.',
    author: { fullName: 'Giáo viên Demo' },
    createdAt: new Date(Date.now() - 86400000),
    comments: [
      { id: 1, content: 'Xin chào mọi người!', author: { fullName: 'Nguyễn Văn A' }, createdAt: new Date() }
    ]
  }
])

const tabs = computed(() => {
  const baseTabs = [
    { id: 'stream', label: 'Bảng tin', icon: 'stream', count: announcements.value.length },
    { id: 'assignments', label: 'Bài tập', icon: 'assignment', count: assignmentsStore.assignments?.length || 0 },
    { id: 'materials', label: 'Tài liệu', icon: 'folder', count: 0 },
    { id: 'members', label: 'Thành viên', icon: 'users', count: currentClass.value?.memberCount || 0 },
  ]

  if (isTeacher.value) {
    baseTabs.push({ id: 'settings', label: 'Cài đặt', icon: 'settings', count: 0 })
  }

  return baseTabs
})

// Color palette for class cover
const classColors = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-purple-500 to-pink-600',
  'from-cyan-500 to-blue-600',
]
const classColor = computed(() => classColors[(classId.value || 0) % classColors.length])

const showCodeDialog = ref(false)
const classCode = computed(() => currentClass.value?.classCode || currentClass.value?.code || '')
const qrCodeUrl = computed(() => {
  if (!classCode.value) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(classCode.value)}`
})

const copyCode = async () => {
  if (classCode.value) {
    await navigator.clipboard.writeText(classCode.value)
    toast.success('Đã sao chép mã lớp!')
  }
}

const postAnnouncement = async () => {
  if (!newPost.value.trim()) return
  
  isPostingAnnouncement.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 500))
    announcements.value.unshift({
      id: Date.now(),
      content: newPost.value,
      author: { fullName: authStore.user?.fullName || 'Bạn' },
      createdAt: new Date(),
      comments: []
    })
    newPost.value = ''
    toast.success('Đã đăng thông báo')
  } finally {
    isPostingAnnouncement.value = false
  }
}

const startLiveSession = async () => {
  try {
    const session = await liveSessionsStore.createSession(classId.value, {
      title: `Buổi học - ${new Date().toLocaleDateString('vi-VN')}`,
    })
    router.push(`/live/${session.id}`)
  } catch (error: any) {
    toast.error('Không thể bắt đầu buổi học', error.message)
  }
}

const formatRelativeTime = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  if (hours < 24) return `${hours} giờ trước`
  if (days < 7) return `${days} ngày trước`
  return new Date(date).toLocaleDateString('vi-VN')
}

onMounted(async () => {
  try {
    await classesStore.fetchClass(classId.value)
    await Promise.all([
      assignmentsStore.fetchAssignments({ classId: classId.value }),
      liveSessionsStore.fetchSessions({ classId: classId.value }),
    ])
  } catch (error: any) {
    console.error('Failed to fetch class:', error)
    
    if (error.statusCode === 403 || error.data?.statusCode === 403) {
      toast.error('Bạn không có quyền truy cập lớp học này')
    } else if (error.statusCode === 404 || error.data?.statusCode === 404) {
      toast.error('Không tìm thấy lớp học')
    } else {
      toast.error('Không thể tải thông tin lớp học')
    }
    
    router.push('/classes')
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div v-if="isLoading" class="max-w-5xl mx-auto space-y-6 py-6">
    <div class="h-52 rounded-2xl bg-gray-200 animate-pulse" />
    <div class="flex gap-4">
      <div v-for="i in 4" :key="i" class="h-10 w-24 rounded-lg bg-gray-200 animate-pulse" />
    </div>
    <div class="h-64 rounded-2xl bg-gray-200 animate-pulse" />
  </div>

  <div v-else-if="currentClass" class="max-w-5xl mx-auto py-6 space-y-6">
    <!-- Header Banner - Enhanced -->
    <div class="relative overflow-hidden rounded-2xl shadow-xl">
      <!-- Cover Image/Gradient -->
      <div class="h-44 bg-gradient-to-br" :class="classColor">
        <!-- Pattern overlay -->
        <div class="absolute inset-0 opacity-20">
          <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="class-grid" width="8" height="8" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="white"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#class-grid)"/>
          </svg>
        </div>
        
        <!-- Quick actions floating -->
        <div class="absolute top-4 right-4 flex gap-2">
          <button
            v-if="isTeacher"
            class="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm font-medium transition-all flex items-center gap-2"
            @click="showCodeDialog = true"
          >
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            </svg>
            <span class="hidden sm:inline">Mã lớp</span>
          </button>
          <button
            v-if="isTeacher"
            class="px-4 py-2 rounded-xl bg-white text-gray-900 font-medium hover:bg-gray-100 transition-all flex items-center gap-2 shadow-lg"
            @click="startLiveSession"
          >
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span class="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
            </span>
            <span>Bắt đầu Live</span>
          </button>
        </div>
      </div>
      
      <!-- Class Info Card -->
      <div class="relative bg-white px-6 pb-6 pt-4">
        <!-- Class icon -->
        <div class="absolute -top-8 left-6 w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-xl font-bold" :class="classColor">
            {{ currentClass.name?.charAt(0) || 'C' }}
          </div>
        </div>
        
        <div class="ml-20">
          <h1 class="text-2xl font-bold text-gray-900">{{ currentClass.name }}</h1>
          <p class="text-gray-600 mt-1">{{ currentClass.description || 'Không có mô tả' }}</p>
          
          <div class="flex flex-wrap items-center gap-4 mt-4 text-sm">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-sm font-medium">
                {{ currentClass.teacher?.fullName?.charAt(0) || 'T' }}
              </div>
              <span class="text-gray-700">{{ currentClass.teacher?.fullName }}</span>
            </div>
            <span class="text-gray-300">•</span>
            <div class="flex items-center gap-1.5 text-gray-600">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
              </svg>
              <span>{{ currentClass.memberCount }} thành viên</span>
            </div>
            <span class="text-gray-300">•</span>
            <div class="flex items-center gap-1.5 text-gray-600">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              </svg>
              <span>{{ assignmentsStore.assignments?.length || 0 }} bài tập</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Active Live Session Banner - Enhanced -->
    <Transition
      enter-active-class="transition-all duration-300"
      enter-from-class="opacity-0 -translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
    >
      <div
        v-if="liveSessionsStore.liveSessions?.some((s: LiveSession) => s.classId === classId)"
        class="rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 p-5 shadow-lg shadow-green-500/25"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <span class="relative flex h-4 w-4">
                <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                <span class="relative inline-flex h-4 w-4 rounded-full bg-white"></span>
              </span>
            </div>
            <div>
              <p class="font-bold text-white text-lg">Buổi học đang diễn ra</p>
              <p class="text-white/80">
                {{ liveSessionsStore.liveSessions?.find((s: LiveSession) => s.classId === classId)?.title }}
              </p>
            </div>
          </div>
          <NuxtLink :to="`/live/${liveSessionsStore.liveSessions?.find((s: LiveSession) => s.classId === classId)?.id}`">
            <button class="px-6 py-3 rounded-xl bg-white text-green-600 font-bold hover:bg-green-50 transition-colors shadow-lg">
              Tham gia ngay
            </button>
          </NuxtLink>
        </div>
      </div>
    </Transition>

    <!-- Tabs - Enhanced -->
    <div class="bg-white rounded-2xl shadow-sm p-2">
      <nav class="flex gap-1">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all"
          :class="activeTab === tab.id
            ? 'bg-primary text-white shadow-lg shadow-primary/25'
            : 'text-gray-600 hover:bg-gray-100'"
          @click="activeTab = tab.id"
        >
          <!-- Stream icon -->
          <svg v-if="tab.icon === 'stream'" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2"/>
          </svg>
          <!-- Assignment icon -->
          <svg v-else-if="tab.icon === 'assignment'" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <!-- Folder icon -->
          <svg v-else-if="tab.icon === 'folder'" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
          </svg>
          <!-- Users icon -->
          <svg v-else-if="tab.icon === 'users'" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <!-- Settings icon -->
          <svg v-else-if="tab.icon === 'settings'" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <span class="hidden sm:inline">{{ tab.label }}</span>
          <span 
            v-if="tab.count && tab.count > 0" 
            class="px-1.5 py-0.5 rounded-full text-xs"
            :class="activeTab === tab.id ? 'bg-white/20' : 'bg-gray-200 text-gray-600'"
          >
            {{ tab.count }}
          </span>
        </button>
      </nav>
    </div>

    <!-- Tab Content -->
    <div>
      <!-- Stream Tab - Enhanced -->
      <!-- Stream Tab - Enhanced -->
      <div v-if="activeTab === 'stream'" class="space-y-6">
        <!-- Post Announcement Box -->
        <div v-if="isTeacher" class="bg-white rounded-2xl shadow-sm p-4">
          <form @submit.prevent="postAnnouncement">
            <div class="flex items-start gap-4">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-medium flex-shrink-0">
                {{ authStore.user?.fullName?.charAt(0) || 'T' }}
              </div>
              <div class="flex-1">
                <textarea
                  v-model="newPost"
                  placeholder="Thông báo cho lớp học..."
                  rows="3"
                  class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none transition-all"
                />
                <div class="flex items-center justify-between mt-3">
                  <div class="flex gap-2">
                    <button type="button" class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
                      <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                    </button>
                    <button type="button" class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
                      <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                      </svg>
                    </button>
                  </div>
                  <button
                    type="submit"
                    :disabled="!newPost.trim() || isPostingAnnouncement"
                    class="px-5 py-2 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {{ isPostingAnnouncement ? 'Đang đăng...' : 'Đăng' }}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        <!-- Announcements List -->
        <TransitionGroup
          tag="div"
          class="space-y-4"
          enter-active-class="transition-all duration-300"
          enter-from-class="opacity-0 -translate-y-4"
          enter-to-class="opacity-100 translate-y-0"
        >
          <div
            v-for="announcement in announcements"
            :key="announcement.id"
            class="bg-white rounded-2xl shadow-sm overflow-hidden"
          >
            <div class="p-5">
              <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                  {{ announcement.author.fullName.charAt(0) }}
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-gray-900">{{ announcement.author.fullName }}</span>
                    <span class="text-gray-400 text-sm">{{ formatRelativeTime(announcement.createdAt) }}</span>
                  </div>
                  <p class="text-gray-700 mt-2 whitespace-pre-wrap">{{ announcement.content }}</p>
                </div>
              </div>
            </div>

            <!-- Comments section -->
            <div v-if="announcement.comments.length > 0" class="border-t border-gray-100 bg-gray-50 px-5 py-4">
              <div
                v-for="comment in announcement.comments"
                :key="comment.id"
                class="flex items-start gap-3"
              >
                <div class="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-sm font-medium">
                  {{ comment.author.fullName.charAt(0) }}
                </div>
                <div class="flex-1 bg-white rounded-xl p-3">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-sm text-gray-900">{{ comment.author.fullName }}</span>
                    <span class="text-gray-400 text-xs">{{ formatRelativeTime(comment.createdAt) }}</span>
                  </div>
                  <p class="text-gray-700 text-sm mt-1">{{ comment.content }}</p>
                </div>
              </div>
            </div>

            <!-- Add comment -->
            <div class="border-t border-gray-100 px-5 py-3">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-medium">
                  {{ authStore.user?.fullName?.charAt(0) || 'U' }}
                </div>
                <input
                  type="text"
                  placeholder="Thêm bình luận..."
                  class="flex-1 h-9 px-4 rounded-full bg-gray-100 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>
        </TransitionGroup>

        <!-- Empty state -->
        <div v-if="announcements.length === 0" class="bg-white rounded-2xl shadow-sm p-12 text-center">
          <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
            <svg class="w-8 h-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7"/>
            </svg>
          </div>
          <p class="text-gray-500 mt-4">Chưa có thông báo nào</p>
          <p class="text-gray-400 text-sm mt-1">Bắt đầu bằng cách đăng thông báo đầu tiên</p>
        </div>
      </div>

      <!-- Assignments Tab - Enhanced -->
      <div v-else-if="activeTab === 'assignments'" class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold text-gray-900">Bài tập</h3>
          <NuxtLink v-if="isTeacher" :to="`/classes/${classId}/assignments/create`">
            <button class="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 4v16m8-8H4" />
              </svg>
              Tạo bài tập
            </button>
          </NuxtLink>
        </div>

        <div v-if="!assignmentsStore.assignments?.length" class="bg-white rounded-2xl shadow-sm p-12 text-center">
          <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
            <svg class="w-8 h-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
            </svg>
          </div>
          <p class="text-gray-500 mt-4">Chưa có bài tập nào</p>
        </div>

        <NuxtLink
          v-for="assignment in assignmentsStore.assignments"
          :key="assignment.id"
          :to="`/assignments/${assignment.id}`"
          class="block bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
        >
          <div class="p-5">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" :class="new Date(assignment.dueDate) < new Date() ? 'bg-red-100' : 'bg-primary/10'">
                <svg class="w-6 h-6" :class="new Date(assignment.dueDate) < new Date() ? 'text-red-600' : 'text-primary'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  <path d="M9 12h6M9 16h6"/>
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="font-semibold text-gray-900 group-hover:text-primary transition-colors">{{ assignment.title }}</h4>
                <p class="text-gray-500 text-sm mt-1 line-clamp-2">
                  {{ assignment.description || 'Không có mô tả' }}
                </p>
                <div class="flex items-center gap-4 mt-3 text-sm">
                  <div class="flex items-center gap-1.5" :class="new Date(assignment.dueDate) < new Date() ? 'text-red-600' : 'text-gray-500'">
                    <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span>{{ new Date(assignment.dueDate).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) }}</span>
                  </div>
                  <span
                    class="px-2.5 py-1 rounded-full text-xs font-medium"
                    :class="new Date(assignment.dueDate) < new Date() ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'"
                  >
                    {{ new Date(assignment.dueDate) < new Date() ? 'Quá hạn' : 'Còn hạn' }}
                  </span>
                </div>
              </div>
              <svg class="w-5 h-5 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </div>
          </div>
        </NuxtLink>
      </div>

      <!-- Materials Tab - Enhanced -->
      <div v-else-if="activeTab === 'materials'" class="bg-white rounded-2xl shadow-sm p-12 text-center">
        <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
          <svg class="w-8 h-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
          </svg>
        </div>
        <p class="text-gray-500 mt-4">Chưa có tài liệu nào</p>
        <button v-if="isTeacher" class="mt-4 px-5 py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-gray-600 font-medium hover:border-primary hover:text-primary transition-colors">
          <svg class="w-5 h-5 inline mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Tải lên tài liệu
        </button>
      </div>

      <!-- Members Tab - Enhanced -->
      <div v-else-if="activeTab === 'members'" class="space-y-4">
        <h3 class="text-lg font-bold text-gray-900">Thành viên ({{ currentClass.memberCount }})</h3>
        
        <!-- Teacher -->
        <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div class="px-5 py-3 bg-gradient-to-r from-primary/10 to-purple-500/10 border-b">
            <span class="text-sm font-medium text-gray-700">Giáo viên</span>
          </div>
          <div class="p-5">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-lg font-bold">
                {{ currentClass.teacher?.fullName?.charAt(0) || 'T' }}
              </div>
              <div class="flex-1">
                <p class="font-semibold text-gray-900">{{ currentClass.teacher?.fullName }}</p>
                <p class="text-sm text-gray-500">{{ currentClass.teacher?.email }}</p>
              </div>
              <span class="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">Chủ lớp</span>
            </div>
          </div>
        </div>

        <!-- Students -->
        <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div class="px-5 py-3 bg-gray-50 border-b flex items-center justify-between">
            <span class="text-sm font-medium text-gray-700">
              Học sinh ({{ (currentClass.memberCount || 1) - 1 }})
            </span>
            <button v-if="isTeacher" class="text-sm text-primary font-medium hover:underline">
              Mời học sinh
            </button>
          </div>
          <div class="divide-y">
            <div v-if="(currentClass.memberCount || 1) <= 1" class="p-8 text-center text-gray-500">
              <p>Chưa có học sinh nào</p>
              <p class="text-sm text-gray-400 mt-1">Chia sẻ mã lớp để mời học sinh tham gia</p>
            </div>
            <!-- Sample students - would be fetched from API -->
            <div v-else v-for="i in 3" :key="i" class="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
              <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                S{{ i }}
              </div>
              <div class="flex-1">
                <p class="font-medium text-gray-900">Học sinh {{ i }}</p>
                <p class="text-sm text-gray-500">student{{ i }}@example.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Settings Tab - Enhanced -->
      <div v-else-if="activeTab === 'settings' && isTeacher" class="space-y-6">
        <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b">
            <h2 class="text-lg font-bold text-gray-900">Cài đặt lớp học</h2>
          </div>
          <div class="p-6 space-y-5">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Tên lớp</label>
              <input
                :value="currentClass.name"
                type="text"
                class="w-full h-12 px-4 rounded-xl border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Mô tả</label>
              <textarea
                :value="currentClass.description"
                rows="3"
                class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              />
            </div>
            <button class="px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors">
              Lưu thay đổi
            </button>
          </div>
        </div>

        <div class="bg-white rounded-2xl shadow-sm overflow-hidden border-2 border-red-100">
          <div class="px-6 py-4 border-b border-red-100 bg-red-50">
            <h2 class="text-lg font-bold text-red-600">Vùng nguy hiểm</h2>
          </div>
          <div class="p-6">
            <p class="text-sm text-gray-600 mb-4">
              Xóa lớp học sẽ xóa tất cả dữ liệu liên quan bao gồm bài tập, tài liệu và thông báo. Hành động này không thể hoàn tác.
            </p>
            <button class="px-6 py-3 rounded-xl border-2 border-red-500 text-red-600 font-medium hover:bg-red-500 hover:text-white transition-colors">
              Xóa lớp học
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Class Code Dialog - Enhanced -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showCodeDialog"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          @click.self="showCodeDialog = false"
        >
          <Transition
            enter-active-class="transition-all duration-200 delay-75"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition-all duration-150"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div v-if="showCodeDialog" class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div class="p-6">
                <h3 class="text-xl font-bold text-gray-900">Mã lớp học</h3>
                <p class="text-gray-500 mt-2">
                  Chia sẻ mã này để học sinh có thể tham gia lớp học của bạn
                </p>
                
                <div class="mt-6 p-6 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-2xl text-center">
                  <span class="font-mono text-4xl font-bold tracking-[0.3em] text-primary">
                    {{ classCode }}
                  </span>
                </div>

                <!-- QR Code -->
                <div v-if="qrCodeUrl" class="mt-6 flex justify-center">
                  <div class="p-4 bg-white rounded-xl border-2 border-gray-100">
                    <img :src="qrCodeUrl" alt="QR Code" class="w-40 h-40" />
                    <p class="text-xs text-gray-500 text-center mt-2">Quét QR để tham gia</p>
                  </div>
                </div>

                <div class="flex gap-3 mt-6">
                  <button
                    class="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    @click="showCodeDialog = false"
                  >
                    Đóng
                  </button>
                  <button
                    class="flex-1 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                    @click="copyCode"
                  >
                    <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Sao chép
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
