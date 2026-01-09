<script setup lang="ts">
const authStore = useAuthStore()
const classesStore = useClassesStore()
const { toast } = useToast()

const isLoading = ref(true)
const searchQuery = ref('')
const filterRole = ref<'all' | 'teaching' | 'enrolled'>('all')
const viewMode = ref<'grid' | 'list'>('grid')
const showJoinDialog = ref(false)
const joinClassCode = ref('')
const isJoining = ref(false)

const filteredClasses = computed(() => {
  let classes = classesStore.classes

  // Filter by role
  if (filterRole.value === 'teaching') {
    classes = classesStore.teachingClasses
  } else if (filterRole.value === 'enrolled') {
    classes = classesStore.enrolledClasses
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    classes = classes.filter(
      c =>
        c.name.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query) ||
        c.teacher?.fullName.toLowerCase().includes(query)
    )
  }

  return classes
})

// Generate gradient colors
const getGradient = (id: number) => {
  const gradients = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-orange-500 to-amber-500',
    'from-pink-500 to-rose-500',
    'from-indigo-500 to-blue-500',
  ]
  return gradients[id % gradients.length]
}

const handleJoinClass = async () => {
  if (!joinClassCode.value.trim()) {
    toast.error('Vui lòng nhập mã lớp')
    return
  }
  isJoining.value = true
  try {
    const joinedClass = await classesStore.joinClass(joinClassCode.value.trim().toUpperCase())
    toast.success(`Đã tham gia lớp ${joinedClass?.name || ''}`)
    showJoinDialog.value = false
    joinClassCode.value = ''
  } catch (error: any) {
    toast.error(error.message || 'Mã lớp không hợp lệ')
  } finally {
    isJoining.value = false
  }
}

onMounted(async () => {
  try {
    await classesStore.fetchClasses()
  } catch (error) {
    toast.error('Không thể tải danh sách lớp học')
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div>
    <div class="space-y-8">
    <!-- Header -->
    <div class="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-foreground">Lớp học</h1>
        <p class="mt-2 text-muted-foreground">
          {{ authStore.isTeacher 
            ? 'Quản lý và tạo mới các lớp học của bạn' 
            : 'Xem và tham gia các lớp học' 
          }}
        </p>
      </div>
      <div class="flex flex-wrap gap-3">
        <NuxtLink v-if="authStore.isTeacher" to="/classes/create">
          <button class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/25">
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14m-7-7h14"/>
            </svg>
            Tạo lớp mới
          </button>
        </NuxtLink>
        <button 
          @click="showJoinDialog = true"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all"
          :class="authStore.isTeacher 
            ? 'border border-input bg-background hover:bg-muted/50' 
            : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25'"
        >
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <line x1="19" x2="19" y1="8" y2="14"/>
            <line x1="22" x2="16" y1="11" y2="11"/>
          </svg>
          Tham gia lớp
        </button>
      </div>
    </div>

    <!-- Filters & Search -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <!-- Search -->
      <div class="relative flex-1 max-w-md">
        <div class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Tìm kiếm lớp học..."
          class="w-full h-12 pl-12 pr-4 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>

      <div class="flex items-center gap-4">
        <!-- Filter Tabs -->
        <div class="flex p-1 rounded-xl bg-muted/50">
          <button
            v-for="filter in [
              { value: 'all', label: 'Tất cả', count: classesStore.classes.length },
              { value: 'teaching', label: 'Đang dạy', count: classesStore.teachingClasses.length },
              { value: 'enrolled', label: 'Đang học', count: classesStore.enrolledClasses.length },
            ]"
            :key="filter.value"
            class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            :class="filterRole === filter.value 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'"
            @click="filterRole = filter.value as any"
          >
            {{ filter.label }}
            <span 
              v-if="filter.count > 0" 
              class="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
              :class="filterRole === filter.value ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'"
            >
              {{ filter.count }}
            </span>
          </button>
        </div>

        <!-- View Mode Toggle -->
        <div class="flex p-1 rounded-lg bg-muted/50">
          <button
            class="p-2 rounded-md transition-all"
            :class="viewMode === 'grid' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            @click="viewMode = 'grid'"
          >
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
            </svg>
          </button>
          <button
            class="p-2 rounded-md transition-all"
            :class="viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            @click="viewMode = 'list'"
          >
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" x2="21" y1="6" y2="6"/>
              <line x1="8" x2="21" y1="12" y2="12"/>
              <line x1="8" x2="21" y1="18" y2="18"/>
              <line x1="3" x2="3.01" y1="6" y2="6"/>
              <line x1="3" x2="3.01" y1="12" y2="12"/>
              <line x1="3" x2="3.01" y1="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" :class="viewMode === 'grid' ? 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-4'">
      <div 
        v-for="i in 6" 
        :key="i" 
        class="rounded-2xl border border-border bg-card overflow-hidden"
        :class="viewMode === 'list' ? 'p-6' : ''"
      >
        <div v-if="viewMode === 'grid'">
          <div class="h-36 bg-muted animate-pulse" />
          <div class="p-5 space-y-3">
            <div class="h-5 w-3/4 bg-muted animate-pulse rounded" />
            <div class="h-4 w-full bg-muted animate-pulse rounded" />
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-muted animate-pulse" />
              <div class="h-4 w-24 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>
        <div v-else class="flex items-center gap-6">
          <div class="w-20 h-20 rounded-xl bg-muted animate-pulse flex-shrink-0" />
          <div class="flex-1 space-y-2">
            <div class="h-5 w-48 bg-muted animate-pulse rounded" />
            <div class="h-4 w-full bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredClasses.length === 0" class="py-16 text-center">
      <div class="w-20 h-20 mx-auto rounded-full bg-muted/50 flex items-center justify-center mb-6">
        <svg class="w-10 h-10 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
          <path d="M6 12v5c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2v-5"/>
        </svg>
      </div>
      <h3 class="text-xl font-semibold text-foreground">
        {{ searchQuery ? 'Không tìm thấy lớp học' : 'Chưa có lớp học nào' }}
      </h3>
      <p class="mt-2 text-muted-foreground max-w-md mx-auto">
        {{ searchQuery 
          ? 'Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc' 
          : authStore.isTeacher 
            ? 'Tạo lớp học đầu tiên để bắt đầu giảng dạy'
            : 'Tham gia một lớp học để bắt đầu học tập'
        }}
      </p>
      <div class="mt-6 flex justify-center gap-3">
        <NuxtLink v-if="authStore.isTeacher" to="/classes/create">
          <button class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all">
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14m-7-7h14"/>
            </svg>
            Tạo lớp học
          </button>
        </NuxtLink>
        <button 
          @click="showJoinDialog = true"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-input bg-background font-medium hover:bg-muted/50 transition-all"
        >
          Tham gia lớp
        </button>
      </div>
    </div>

    <!-- Grid View -->
    <div v-else-if="viewMode === 'grid'" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="classItem in filteredClasses"
        :key="classItem.id"
        :to="`/classes/${classItem.id}`"
        class="group"
      >
        <div class="h-full rounded-2xl border border-border bg-card overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all duration-300">
          <!-- Cover -->
          <div :class="`relative h-36 bg-gradient-to-br ${getGradient(classItem.id)}`">
            <img
              v-if="classItem.coverImage"
              :src="classItem.coverImage"
              :alt="classItem.name"
              class="absolute inset-0 h-full w-full object-cover"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            
            <!-- Class Initial -->
            <div class="absolute top-4 left-4 w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span class="text-xl font-bold text-white">{{ classItem.name.charAt(0) }}</span>
            </div>

            <!-- Live Badge -->
            <div v-if="classItem.hasActiveLiveSession" class="absolute top-4 right-4">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-medium shadow-lg">
                <span class="relative flex h-2 w-2">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span class="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
                </span>
                LIVE
              </span>
            </div>

            <!-- Member Count -->
            <div class="absolute bottom-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-sm text-white text-xs">
              <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
              </svg>
              {{ classItem.memberCount || 0 }}
            </div>
          </div>

          <!-- Content -->
          <div class="p-5">
            <h3 class="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {{ classItem.name }}
            </h3>
            <p class="mt-1.5 text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
              {{ classItem.description || 'Không có mô tả' }}
            </p>

            <div class="mt-4 flex items-center justify-between pt-4 border-t border-border">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                  {{ classItem.teacher?.fullName?.charAt(0) || '?' }}
                </div>
                <span class="text-sm text-muted-foreground truncate max-w-[120px]">
                  {{ classItem.teacher?.fullName || 'Chưa xác định' }}
                </span>
              </div>
              <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                {{ classItem.assignmentCount || 0 }}
              </div>
            </div>
          </div>
        </div>
      </NuxtLink>
    </div>

    <!-- List View -->
    <div v-else class="space-y-4">
      <NuxtLink
        v-for="classItem in filteredClasses"
        :key="classItem.id"
        :to="`/classes/${classItem.id}`"
        class="group block"
      >
        <div class="rounded-2xl border border-border bg-card p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300">
          <div class="flex items-center gap-6">
            <!-- Avatar -->
            <div 
              :class="`w-20 h-20 rounded-xl bg-gradient-to-br ${getGradient(classItem.id)} flex items-center justify-center flex-shrink-0`"
            >
              <span class="text-2xl font-bold text-white">{{ classItem.name.charAt(0) }}</span>
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3">
                <h3 class="font-semibold text-lg text-foreground group-hover:text-primary transition-colors truncate">
                  {{ classItem.name }}
                </h3>
                <span 
                  v-if="classItem.hasActiveLiveSession"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-medium"
                >
                  <span class="relative flex h-2 w-2">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span class="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                  </span>
                  LIVE
                </span>
              </div>
              <p class="mt-1 text-sm text-muted-foreground line-clamp-1">
                {{ classItem.description || 'Không có mô tả' }}
              </p>
              <div class="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                <span class="flex items-center gap-1.5">
                  <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M20 21a8 8 0 0 0-16 0"/>
                  </svg>
                  {{ classItem.teacher?.fullName }}
                </span>
                <span class="flex items-center gap-1.5">
                  <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                  </svg>
                  {{ classItem.memberCount || 0 }} thành viên
                </span>
                <span class="flex items-center gap-1.5">
                  <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  {{ classItem.assignmentCount || 0 }} bài tập
                </span>
              </div>
            </div>

            <!-- Arrow -->
            <div class="flex-shrink-0">
              <div class="w-10 h-10 rounded-full bg-muted/50 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                <svg class="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14m-7-7 7 7-7 7"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </NuxtLink>
    </div>
    </div>

  <!-- Join Class Dialog -->
  <Teleport to="body">
    <div
      v-if="showJoinDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      @click.self="showJoinDialog = false"
    >
      <div class="relative bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in-0 zoom-in-95">
        <!-- Close Button -->
        <button
          @click="showJoinDialog = false"
          class="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>

        <!-- Header -->
        <div class="mb-6">
          <div class="flex items-center gap-3 mb-2">
            <div class="p-2 bg-primary/10 rounded-xl">
              <svg class="w-6 h-6 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" x2="19" y1="8" y2="14"/>
                <line x1="22" x2="16" y1="11" y2="11"/>
              </svg>
            </div>
            <h2 class="text-2xl font-bold">Tham gia lớp học</h2>
          </div>
          <p class="text-sm text-muted-foreground">
            Nhập mã lớp học để tham gia vào lớp của giáo viên
          </p>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleJoinClass" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Mã lớp</label>
            <input
              v-model="joinClassCode"
              type="text"
              placeholder="Nhập mã lớp (VD: ABC123)"
              class="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono uppercase"
              :disabled="isJoining"
              required
            />
            <p class="text-xs text-muted-foreground mt-2">
              Mã lớp được cung cấp bởi giáo viên của bạn
            </p>
          </div>

          <div class="flex gap-3">
            <button
              type="button"
              @click="showJoinDialog = false"
              class="flex-1 px-4 py-3 rounded-xl border border-input hover:bg-muted/50 font-medium transition-all"
              :disabled="isJoining"
            >
              Hủy
            </button>
            <button
              type="submit"
              class="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              :disabled="isJoining"
            >
              <svg v-if="isJoining" class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isJoining ? 'Đang tham gia...' : 'Tham gia' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
  </div>
</template>
