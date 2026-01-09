<script setup lang="ts">
const authStore = useAuthStore()
const classesStore = useClassesStore()
const { toast } = useToast()

const isLoading = ref(true)
const searchQuery = ref('')
const filterRole = ref<'all' | 'teaching' | 'enrolled'>('all')

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
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Lớp học</h1>
        <p class="text-muted-foreground">
          Quản lý và tham gia các lớp học của bạn
        </p>
      </div>
      <div class="flex gap-2">
        <NuxtLink v-if="authStore.isTeacher" to="/classes/create">
          <UiButton>
            <svg class="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 4v16m8-8H4" />
            </svg>
            Tạo lớp mới
          </UiButton>
        </NuxtLink>
        <NuxtLink to="/classes/join">
          <UiButton :variant="authStore.isTeacher ? 'outline' : 'default'">
            <svg class="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            Tham gia lớp
          </UiButton>
        </NuxtLink>
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
          placeholder="Tìm kiếm lớp học..."
          class="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div class="flex gap-2">
        <button
          v-for="filter in [
            { value: 'all', label: 'Tất cả' },
            { value: 'teaching', label: 'Đang dạy' },
            { value: 'enrolled', label: 'Đang học' },
          ]"
          :key="filter.value"
          class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          :class="filterRole === filter.value ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'"
          @click="filterRole = filter.value as any"
        >
          {{ filter.label }}
        </button>
      </div>
    </div>

    <!-- Classes Grid -->
    <div v-if="isLoading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UiCard v-for="i in 6" :key="i">
        <UiCardContent class="p-6">
          <UiSkeleton class="mb-4 h-32 w-full" variant="rounded" />
          <UiSkeleton class="mb-2 h-6 w-3/4" />
          <UiSkeleton class="h-4 w-1/2" />
        </UiCardContent>
      </UiCard>
    </div>

    <div v-else-if="filteredClasses.length === 0" class="py-12 text-center">
      <svg class="mx-auto h-16 w-16 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 14l9-5-9-5-9 5 9 5z" />
        <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      </svg>
      <h3 class="mt-4 text-lg font-semibold">Không có lớp học nào</h3>
      <p class="mt-1 text-muted-foreground">
        {{ searchQuery ? 'Không tìm thấy lớp học phù hợp' : 'Hãy tạo hoặc tham gia lớp học đầu tiên' }}
      </p>
      <div class="mt-4 flex justify-center gap-2">
        <NuxtLink v-if="authStore.isTeacher" to="/classes/create">
          <UiButton>Tạo lớp học</UiButton>
        </NuxtLink>
        <NuxtLink to="/classes/join">
          <UiButton variant="outline">Tham gia lớp</UiButton>
        </NuxtLink>
      </div>
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="classItem in filteredClasses"
        :key="classItem.id"
        :to="`/classes/${classItem.id}`"
      >
        <UiCard class="h-full transition-shadow hover:shadow-lg">
          <!-- Cover Image -->
          <div class="relative h-32 overflow-hidden rounded-t-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <img
              v-if="classItem.coverImage"
              :src="classItem.coverImage"
              :alt="classItem.name"
              class="h-full w-full object-cover"
            />
            <div v-else class="flex h-full items-center justify-center">
              <span class="text-4xl font-bold text-primary/30">
                {{ classItem.name.charAt(0) }}
              </span>
            </div>
            
            <!-- Live Badge -->
            <UiBadge
              v-if="classItem.hasActiveLiveSession"
              variant="success"
              class="absolute right-2 top-2"
            >
              <span class="mr-1 h-2 w-2 animate-pulse rounded-full bg-white"></span>
              LIVE
            </UiBadge>
          </div>

          <UiCardContent class="p-4">
            <h3 class="line-clamp-1 font-semibold">{{ classItem.name }}</h3>
            <p class="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {{ classItem.description || 'Không có mô tả' }}
            </p>

            <div class="mt-4 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UiAvatar
                  :src="classItem.teacher?.avatarUrl"
                  :alt="classItem.teacher?.fullName"
                  size="xs"
                />
                <span class="text-sm text-muted-foreground">
                  {{ classItem.teacher?.fullName }}
                </span>
              </div>
              <div class="flex items-center gap-1 text-sm text-muted-foreground">
                <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {{ classItem.memberCount }}
              </div>
            </div>
          </UiCardContent>
        </UiCard>
      </NuxtLink>
    </div>
  </div>
</template>
