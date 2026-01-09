<script setup lang="ts">
import type { LiveSession } from '~/types'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const classesStore = useClassesStore()
const assignmentsStore = useAssignmentsStore()
const liveSessionsStore = useLiveSessionsStore()
const announcementsStore = useAnnouncementsStore()
const { toast } = useToast()

const classId = computed(() => Number(route.params.id))
const isLoading = ref(true)
const activeTab = ref('stream')

const currentClass = computed(() => classesStore.currentClass)
const isTeacher = computed(() => currentClass.value?.teacherId === authStore.user?.id)
const announcements = computed(() => announcementsStore.announcements)
const members = computed(() => classesStore.members || [])

// Active live session for this class
const activeLiveSession = computed(() => {
  const sessions = liveSessionsStore.liveSessions || []
  return sessions.find((s: LiveSession) => s.classId === classId.value)
})

// All sessions for this class
const classLiveSessions = computed(() => {
  return liveSessionsStore.sessions?.filter((s: LiveSession) => s.classId === classId.value) || []
})

// New post state
const newPost = ref('')
const isPostingAnnouncement = ref(false)

const tabs = computed(() => {
  const baseTabs = [
    { id: 'stream', label: 'Bảng tin', icon: 'stream', count: announcements.value.length },
    { id: 'assignments', label: 'Bài tập', icon: 'assignment', count: assignmentsStore.assignments?.length || 0 },
    { id: 'live', label: 'Phiên live', icon: 'video', count: classLiveSessions.value.length },
    { id: 'materials', label: 'Tài liệu', icon: 'folder', count: 0 },
    { id: 'members', label: 'Thành viên', icon: 'users', count: currentClass.value?.memberCount || 0 },
    { id: 'attendance', label: 'Điểm danh', icon: 'attendance', count: 0 },
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
const showDeleteDialog = ref(false)
const showEditDialog = ref(false)
const showLiveShareDialog = ref(false)
const showCreateSessionDialog = ref(false)
const createdLiveSession = ref<{ id: number; title: string } | null>(null)
const isDeleting = ref(false)
const isSaving = ref(false)
const isCreatingSession = ref(false)

// Create session form
const createSessionForm = reactive({
  title: '',
})

const editForm = reactive({
  name: '',
  description: '',
  subject: '',
})

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

const openEditDialog = () => {
  if (currentClass.value) {
    editForm.name = currentClass.value.name
    editForm.description = currentClass.value.description || ''
    editForm.subject = currentClass.value.subject || ''
    showEditDialog.value = true
  }
}

const saveClassChanges = async () => {
  if (!editForm.name.trim()) {
    toast.error('Vui lòng nhập tên lớp')
    return
  }
  
  isSaving.value = true
  try {
    await classesStore.updateClass(classId.value, editForm)
    toast.success('Đã cập nhật lớp học')
    showEditDialog.value = false
  } catch (error: any) {
    toast.error('Không thể cập nhật lớp học', error.message)
  } finally {
    isSaving.value = false
  }
}

const deleteClass = async () => {
  isDeleting.value = true
  try {
    await classesStore.deleteClass(classId.value)
    toast.success('Đã xóa lớp học')
    router.push('/classes')
  } catch (error: any) {
    toast.error('Không thể xóa lớp học', error.message)
    showDeleteDialog.value = false
  } finally {
    isDeleting.value = false
  }
}

const postAnnouncement = async () => {
  if (!newPost.value.trim()) return
  
  isPostingAnnouncement.value = true
  try {
    await announcementsStore.createAnnouncement(classId.value, {
      title: 'Thông báo',
      content: newPost.value,
      allowComments: true,
    })
    newPost.value = ''
    toast.success('Đã đăng thông báo')
  } catch (error: any) {
    toast.error('Không thể đăng thông báo', error.message)
  } finally {
    isPostingAnnouncement.value = false
  }
}

const liveShareLink = computed(() => {
  if (!createdLiveSession.value) return ''
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/live/${createdLiveSession.value.id}`
  }
  return ''
})

const copyLiveLink = async () => {
  if (liveShareLink.value) {
    await navigator.clipboard.writeText(liveShareLink.value)
    toast.success('Đã sao chép link phiên live!')
  }
}

const goToLiveSession = () => {
  if (createdLiveSession.value) {
    router.push(`/live/${createdLiveSession.value.id}`)
  }
}

// Open create session dialog
const openCreateSessionDialog = () => {
  createSessionForm.title = `Buổi học - ${new Date().toLocaleDateString('vi-VN')}`
  showCreateSessionDialog.value = true
}

// Create and start live session
const startLiveSession = async () => {
  isCreatingSession.value = true
  try {
    // Create the session
    const session = await liveSessionsStore.createSession(classId.value, {
      title: createSessionForm.title || `Buổi học - ${new Date().toLocaleDateString('vi-VN')}`,
    })
    
    // Start the session immediately to set status to 'live'
    await liveSessionsStore.startSession(session.id)
    
    // Refresh sessions to update the list
    await liveSessionsStore.fetchSessions({ classId: classId.value })
    
    // Close create dialog and show share modal
    showCreateSessionDialog.value = false
    createdLiveSession.value = { id: session.id, title: session.title }
    showLiveShareDialog.value = true
  } catch (error: any) {
    toast.error('Không thể bắt đầu buổi học', error.message)
  } finally {
    isCreatingSession.value = false
  }
}

const startExistingSession = async (sessionId: number) => {
  try {
    await liveSessionsStore.startSession(sessionId)
    await liveSessionsStore.fetchSessions({ classId: classId.value })
    toast.success('Đã bắt đầu phiên live')
    router.push(`/live/${sessionId}`)
  } catch (error: any) {
    toast.error('Không thể bắt đầu phiên live', error.message)
  }
}

const endLiveSession = async (sessionId: number) => {
  if (!confirm('Bạn có chắc muốn kết thúc phiên live này?')) return
  try {
    await liveSessionsStore.endSession(sessionId)
    await liveSessionsStore.fetchSessions({ classId: classId.value })
    toast.success('Đã kết thúc phiên live')
  } catch (error: any) {
    toast.error('Không thể kết thúc phiên live', error.message)
  }
}

const deleteLiveSession = async (sessionId: number) => {
  if (!confirm('Bạn có chắc muốn xóa phiên live này? Hành động này không thể hoàn tác.')) return
  try {
    await liveSessionsStore.deleteSession(sessionId)
    await liveSessionsStore.fetchSessions({ classId: classId.value })
    toast.success('Đã xóa phiên live')
  } catch (error: any) {
    toast.error('Không thể xóa phiên live', error.message)
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
      announcementsStore.fetchAnnouncements(classId.value),
      classesStore.fetchMembers(classId.value),
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
  <div>
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
        v-if="activeLiveSession"
        class="rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 p-5 shadow-lg shadow-green-500/25"
      >
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <span class="relative flex h-4 w-4">
                <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                <span class="relative inline-flex h-4 w-4 rounded-full bg-white"></span>
              </span>
            </div>
            <div>
              <p class="font-bold text-white text-lg">🔴 Buổi học đang diễn ra</p>
              <p class="text-white/80">{{ activeLiveSession.title }}</p>
            </div>
          </div>
          <NuxtLink :to="`/live/${activeLiveSession.id}`">
            <button class="px-6 py-3 rounded-xl bg-white text-green-600 font-bold hover:bg-green-50 transition-colors shadow-lg flex items-center gap-2">
              <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
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
          <!-- Video/Live icon -->
          <svg v-else-if="tab.icon === 'video'" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="23 7 16 12 23 17 23 7"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
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
          <!-- Attendance icon -->
          <svg v-else-if="tab.icon === 'attendance'" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
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
            :class="announcement.isPinned ? 'border-2 border-primary' : ''"
          >
            <div class="p-5">
              <div class="flex items-start justify-between gap-4">
                <div class="flex items-start gap-4 flex-1">
                  <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                    {{ announcement.author?.fullName?.charAt(0) || 'T' }}
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-semibold text-gray-900">{{ announcement.author?.fullName || 'Giáo viên' }}</span>
                      <span class="text-gray-400 text-sm">{{ formatRelativeTime(announcement.createdAt) }}</span>
                      <span v-if="announcement.isPinned" class="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary flex items-center gap-1">
                        <svg class="w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M12 17v5m-3-2 3-3 3 3m-3-13V2m-3 2 3 3 3-3"/>
                        </svg>
                        Đã ghim
                      </span>
                      <span v-if="announcement.priority === 'important'" class="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-600">
                        Quan trọng
                      </span>
                      <span v-else-if="announcement.priority === 'urgent'" class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                        Khẩn cấp
                      </span>
                    </div>
                    <h3 v-if="announcement.title" class="font-semibold text-lg text-gray-900 mt-2">{{ announcement.title }}</h3>
                    <p class="text-gray-700 mt-2 whitespace-pre-wrap">{{ announcement.content }}</p>
                  </div>
                </div>
                <button v-if="isTeacher" class="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                  <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="1"/>
                    <circle cx="12" cy="5" r="1"/>
                    <circle cx="12" cy="19" r="1"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Comments section -->
            <div v-if="announcement.comments && announcement.comments.length > 0" class="border-t border-gray-100 bg-gray-50 px-5 py-4 space-y-3">
              <div
                v-for="comment in announcement.comments"
                :key="comment.id"
                class="flex items-start gap-3"
              >
                <div class="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-sm font-medium">
                  {{ comment.userName?.charAt(0) || 'U' }}
                </div>
                <div class="flex-1 bg-white rounded-xl p-3">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-sm text-gray-900">{{ comment.userName }}</span>
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

      <!-- Live Sessions Tab -->
      <div v-else-if="activeTab === 'live'" class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold text-gray-900">Phiên live</h3>
          <button 
            v-if="isTeacher"
            @click="openCreateSessionDialog"
            class="px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors flex items-center gap-2"
          >
            <span class="relative flex h-3 w-3">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span class="relative inline-flex h-3 w-3 rounded-full bg-white"></span>
            </span>
            Bắt đầu phiên live
          </button>
        </div>
        
        <!-- Live Sessions List -->
        <div class="space-y-3">
          <div v-if="!classLiveSessions.length" class="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
              <svg class="w-8 h-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
            </div>
            <p class="text-gray-500 mt-4">Chưa có phiên live nào</p>
          </div>
          
          <div 
            v-for="session in classLiveSessions" 
            :key="session.id"
            class="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-all"
          >
            <div class="p-5">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <h4 class="font-semibold text-gray-900">{{ session.title }}</h4>
                    <span 
                      v-if="session.status === 'live'"
                      class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold"
                    >
                      <span class="relative flex h-1.5 w-1.5">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-white"></span>
                      </span>
                      LIVE
                    </span>
                    <span 
                      v-else-if="session.status === 'scheduled'"
                      class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium"
                    >
                      Đã lên lịch
                    </span>
                    <span 
                      v-else
                      class="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium"
                    >
                      Đã kết thúc
                    </span>
                  </div>
                  <div class="mt-2 flex items-center gap-4 text-sm text-gray-500">
                    <span class="flex items-center gap-1">
                      <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                      {{ session.startedAt ? new Date(session.startedAt).toLocaleString('vi-VN') : session.scheduledAt ? new Date(session.scheduledAt).toLocaleString('vi-VN') : 'Chưa xác định' }}
                    </span>
                    <span class="flex items-center gap-1">
                      <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                      </svg>
                      {{ session.currentParticipants || 0 }} / {{ session.maxParticipants || 20 }}
                    </span>
                  </div>
                </div>
                
                <div class="flex items-center gap-2">
                  <!-- Join button -->
                  <NuxtLink 
                    v-if="session.status === 'live'"
                    :to="`/live/${session.id}`"
                    class="px-4 py-2 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
                  >
                    Tham gia
                  </NuxtLink>
                  
                  <!-- Teacher actions -->
                  <template v-if="isTeacher">
                    <button
                      v-if="session.status === 'scheduled'"
                      @click="startExistingSession(session.id)"
                      class="px-4 py-2 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
                    >
                      Bắt đầu
                    </button>
                    <button
                      v-if="session.status === 'live'"
                      @click="endLiveSession(session.id)"
                      class="px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors"
                    >
                      Kết thúc
                    </button>
                    <button
                      @click="deleteLiveSession(session.id)"
                      class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Xóa phiên"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
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
              Học sinh ({{ members.filter((m: any) => m.role === 'STUDENT').length }})
            </span>
            <button v-if="isTeacher" class="text-sm text-primary font-medium hover:underline">
              Mời học sinh
            </button>
          </div>
          <div class="divide-y">
            <div v-if="members.filter((m: any) => m.role === 'STUDENT').length === 0" class="p-8 text-center text-gray-500">
              <p>Chưa có học sinh nào</p>
              <p class="text-sm text-gray-400 mt-1">Chia sẻ mã lớp để mời học sinh tham gia</p>
            </div>
            <!-- Real students from API -->
            <div v-else v-for="member in members.filter((m: any) => m.role === 'STUDENT')" :key="member.id" class="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium">
                {{ (member.user?.fullName || member.fullName || 'S').charAt(0).toUpperCase() }}
              </div>
              <div class="flex-1">
                <p class="font-medium text-gray-900">{{ member.user?.fullName || member.fullName || 'Học sinh' }}</p>
                <p class="text-sm text-gray-500">{{ member.user?.email || member.email || '' }}</p>
              </div>
              <button 
                v-if="isTeacher"
                class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                @click="classesStore.removeMember(classId, member.userId || member.id)"
                title="Xóa học sinh"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Attendance Tab - Giống Moodle -->
      <div v-else-if="activeTab === 'attendance' && isTeacher" class="space-y-6">
        <ClassAttendanceManager :class-id="classId" :members="members" />
      </div>

      <!-- Settings Tab - Enhanced -->
      <div v-else-if="activeTab === 'settings' && isTeacher" class="space-y-6">
        <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b flex items-center justify-between">
            <h2 class="text-lg font-bold text-gray-900">Thông tin lớp học</h2>
            <button
              @click="openEditDialog"
              class="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Chỉnh sửa
            </button>
          </div>
          <div class="p-6 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-1">Tên lớp</label>
              <p class="text-gray-900 font-medium">{{ currentClass.name }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-1">Mô tả</label>
              <p class="text-gray-900">{{ currentClass.description || 'Chưa có mô tả' }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-1">Môn học</label>
              <p class="text-gray-900">{{ currentClass.subject || 'Chưa xác định' }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-1">Mã lớp</label>
              <p class="font-mono text-lg font-bold text-primary">{{ classCode }}</p>
            </div>
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
            <button
              @click="showDeleteDialog = true"
              class="px-6 py-3 rounded-xl border-2 border-red-500 text-red-600 font-medium hover:bg-red-500 hover:text-white transition-colors"
            >
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

    <!-- Edit Class Dialog -->
    <Teleport to="body">
      <div
        v-if="showEditDialog"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        @click.self="showEditDialog = false"
      >
        <div class="relative bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in-0 zoom-in-95">
          <button
            @click="showEditDialog = false"
            class="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>

          <div class="mb-6">
            <div class="flex items-center gap-3 mb-2">
              <div class="p-2 bg-primary/10 rounded-xl">
                <svg class="w-6 h-6 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                </svg>
              </div>
              <h2 class="text-2xl font-bold">Chỉnh sửa lớp học</h2>
            </div>
          </div>

          <form @submit.prevent="saveClassChanges" class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2">Tên lớp học</label>
              <input
                v-model="editForm.name"
                type="text"
                required
                class="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="VD: Lập trình Web - K20"
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">Môn học</label>
              <input
                v-model="editForm.subject"
                type="text"
                class="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="VD: Lập trình"
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">Mô tả</label>
              <textarea
                v-model="editForm.description"
                rows="3"
                class="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                placeholder="Mô tả về lớp học..."
              />
            </div>

            <div class="flex gap-3 pt-2">
              <button
                type="button"
                @click="showEditDialog = false"
                class="flex-1 px-4 py-3 rounded-xl border border-input hover:bg-muted/50 font-medium transition-all"
                :disabled="isSaving"
              >
                Hủy
              </button>
              <button
                type="submit"
                class="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                :disabled="isSaving"
              >
                <svg v-if="isSaving" class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isSaving ? 'Đang lưu...' : 'Lưu thay đổi' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirmation Dialog -->
    <Teleport to="body">
      <div
        v-if="showDeleteDialog"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        @click.self="showDeleteDialog = false"
      >
        <div class="relative bg-card border-2 border-red-200 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in-0 zoom-in-95">
          <div class="flex justify-center mb-4">
            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg class="w-8 h-8 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18"/>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </div>
          </div>

          <div class="text-center mb-6">
            <h2 class="text-2xl font-bold text-red-600 mb-2">Xác nhận xóa lớp học</h2>
            <p class="text-muted-foreground">
              Bạn có chắc chắn muốn xóa lớp <strong class="text-foreground">{{ currentClass?.name }}</strong>?
            </p>
            <p class="text-sm text-red-600 mt-3 font-medium">
              ⚠️ Hành động này không thể hoàn tác!
            </p>
            <p class="text-xs text-muted-foreground mt-2">
              Tất cả bài tập, tài liệu và thông báo sẽ bị xóa vĩnh viễn.
            </p>
          </div>

          <div class="flex gap-3">
            <button
              @click="showDeleteDialog = false"
              class="flex-1 px-4 py-3 rounded-xl border border-input hover:bg-muted/50 font-medium transition-all"
              :disabled="isDeleting"
            >
              Hủy
            </button>
            <button
              @click="deleteClass"
              class="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              :disabled="isDeleting"
            >
              <svg v-if="isDeleting" class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isDeleting ? 'Đang xóa...' : 'Xóa lớp học' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Create Live Session Dialog -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showCreateSessionDialog" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showCreateSessionDialog = false" />
          <div class="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div class="text-center mb-6">
              <div class="w-16 h-16 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span class="relative flex h-6 w-6">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span class="relative inline-flex h-6 w-6 rounded-full bg-red-500"></span>
                </span>
              </div>
              <h3 class="text-xl font-bold text-gray-900 dark:text-white">Bắt đầu phiên live</h3>
              <p class="text-gray-500 dark:text-gray-400 mt-1">Cấu hình phiên live trước khi bắt đầu</p>
            </div>

            <!-- Session Title -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tiêu đề phiên live</label>
              <input
                v-model="createSessionForm.title"
                type="text"
                placeholder="Nhập tiêu đề..."
                class="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            <!-- Info box -->
            <div class="mb-4 p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl">
              <div class="flex gap-2 items-start">
                <svg class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4"/>
                  <path d="M12 8h.01"/>
                </svg>
                <div class="text-sm text-blue-700 dark:text-blue-300">
                  <p class="font-medium">Các tính năng trong phiên live:</p>
                  <ul class="mt-1 text-xs space-y-0.5 text-blue-600 dark:text-blue-400">
                    <li>• <strong>Điểm danh</strong>: Mở panel điểm danh để bắt đầu</li>
                    <li>• <strong>Phòng chờ</strong>: Mở panel phòng chờ và bật để kiểm duyệt</li>
                    <li>• <strong>Ghi hình</strong>: Sử dụng panel ghi hình (demo only)</li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-3">
              <button
                class="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                @click="showCreateSessionDialog = false"
                :disabled="isCreatingSession"
              >
                Hủy
              </button>
              <button
                class="flex-1 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                @click="startLiveSession"
                :disabled="isCreatingSession"
              >
                <svg v-if="isCreatingSession" class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="relative flex h-2 w-2" v-if="!isCreatingSession">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span class="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
                </span>
                {{ isCreatingSession ? 'Đang tạo...' : 'Bắt đầu' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Live Session Share Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showLiveShareDialog" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="goToLiveSession" />
          <div class="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div class="text-center mb-4">
              <div class="w-16 h-16 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span class="relative flex h-6 w-6">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span class="relative inline-flex h-6 w-6 rounded-full bg-green-500"></span>
                </span>
              </div>
              <h3 class="text-xl font-bold text-gray-900 dark:text-white">Phiên live đã được tạo!</h3>
              <p class="text-gray-500 dark:text-gray-400 mt-1">{{ createdLiveSession?.title }}</p>
            </div>

            <p class="text-sm text-gray-600 dark:text-gray-300 text-center mb-4">
              Chia sẻ link hoặc QR code cho sinh viên để tham gia
            </p>

            <!-- Link Input -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Link tham gia</label>
              <div class="flex gap-2">
                <input
                  :value="liveShareLink"
                  readonly
                  class="flex-1 h-10 px-3 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm text-gray-900 dark:text-white"
                />
                <button
                  class="px-4 h-10 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium transition-colors flex items-center gap-2"
                  @click="copyLiveLink"
                >
                  <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  Sao chép
                </button>
              </div>
            </div>

            <!-- QR Code -->
            <div class="text-center mb-4">
              <div class="inline-flex bg-white p-3 rounded-xl border border-gray-200">
                <img 
                  v-if="liveShareLink"
                  :src="`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(liveShareLink)}`"
                  alt="QR Code"
                  class="w-36 h-36"
                />
              </div>
              <p class="text-gray-400 text-xs mt-2">Quét mã QR để tham gia</p>
            </div>

            <!-- Info box -->
            <div class="mb-4 p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl">
              <div class="flex gap-2 items-start">
                <svg class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4"/>
                  <path d="M12 8h.01"/>
                </svg>
                <div class="text-sm text-blue-700 dark:text-blue-300">
                  <p class="font-medium">Các tính năng:</p>
                  <ul class="mt-1 text-xs space-y-0.5 text-blue-600 dark:text-blue-400">
                    <li>• <strong>Điểm danh</strong>: Bấm icon điểm danh → Chọn mã code/QR hoặc thủ công</li>
                    <li>• <strong>Phòng chờ</strong>: Bấm icon phòng chờ → Toggle "Bật phòng chờ"</li>
                    <li>• <strong>Ghi hình</strong>: Bấm icon ghi hình (demo only)</li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-3">
              <button
                class="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                @click="showLiveShareDialog = false"
              >
                Đóng
              </button>
              <button
                class="flex-1 px-4 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium transition-colors flex items-center justify-center gap-2"
                @click="goToLiveSession"
              >
                <span class="relative flex h-2 w-2">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span class="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
                </span>
                Vào phiên live
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    </div>
  </div>
</template>
