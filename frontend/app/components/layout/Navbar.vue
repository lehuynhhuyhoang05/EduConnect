<script setup lang="ts">
const authStore = useAuthStore()
const notificationStore = useNotificationsStore()
const route = useRoute()
const router = useRouter()

const isMenuOpen = ref(false)
const isProfileOpen = ref(false)
const isSearchOpen = ref(false)
const searchQuery = ref('')

const unreadCount = computed(() => notificationStore.unreadCount || 0)

const navigation = computed(() => {
  const items = [
    { name: 'Dashboard', href: '/dashboard', icon: 'home' },
    { name: 'Lớp học', href: '/classes', icon: 'academic-cap' },
    { name: 'Bài tập', href: '/assignments', icon: 'clipboard' },
    { name: 'Lịch học', href: '/schedule', icon: 'calendar' },
  ]

  return items
})

const handleLogout = async () => {
  authStore.logout()
  router.push('/auth/login')
}

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
  isMenuOpen.value = false
}

// Close dropdowns when clicking outside
onMounted(() => {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target.closest('[data-profile-trigger]') && !target.closest('[data-profile-menu]')) {
      isProfileOpen.value = false
    }
  })
})

// Close menu on route change
watch(() => route.path, closeMenu)
</script>

<template>
  <nav class="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
    <div class="mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex h-16 items-center justify-between gap-4">
        <!-- Logo & Brand -->
        <div class="flex items-center gap-8">
          <NuxtLink to="/dashboard" class="flex items-center gap-2.5 group">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-shadow">
              <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2v-5" />
              </svg>
            </div>
            <span class="hidden font-bold text-lg sm:inline-block">EduLMS</span>
          </NuxtLink>

          <!-- Desktop Navigation -->
          <div class="hidden lg:flex lg:items-center lg:gap-1">
            <NuxtLink
              v-for="item in navigation"
              :key="item.name"
              :to="item.href"
              class="relative px-4 py-2 text-sm font-medium transition-all rounded-lg group"
              :class="[
                route.path.startsWith(item.href)
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              ]"
            >
              {{ item.name }}
              <span 
                v-if="route.path.startsWith(item.href)"
                class="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
              />
            </NuxtLink>
          </div>
        </div>

        <!-- Right side -->
        <div class="flex items-center gap-2">
          <!-- Search Button (Desktop) -->
          <button
            class="hidden md:flex items-center gap-2 h-9 px-4 rounded-lg border border-input bg-background/50 text-muted-foreground text-sm hover:bg-muted/50 transition-colors"
            @click="isSearchOpen = true"
          >
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <span class="hidden lg:inline">Tìm kiếm...</span>
            <kbd class="hidden lg:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
              <span class="text-xs">⌘</span>K
            </kbd>
          </button>

          <!-- Notifications -->
          <NuxtLink
            to="/notifications"
            class="relative flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
            </svg>
            <span 
              v-if="unreadCount > 0"
              class="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-background"
            >
              {{ unreadCount > 9 ? '9+' : unreadCount }}
            </span>
          </NuxtLink>

          <!-- Profile Dropdown -->
          <div class="relative">
            <button
              data-profile-trigger
              class="flex items-center gap-2 rounded-lg p-1.5 hover:bg-muted/50 transition-colors"
              @click.stop="isProfileOpen = !isProfileOpen"
            >
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-medium text-sm ring-2 ring-background">
                {{ authStore.user?.fullName?.charAt(0) || '?' }}
              </div>
              <div class="hidden md:block text-left">
                <p class="text-sm font-medium text-foreground leading-tight truncate max-w-[120px]">
                  {{ authStore.user?.fullName || 'Người dùng' }}
                </p>
                <p class="text-xs text-muted-foreground">
                  {{ authStore.isTeacher ? 'Giáo viên' : 'Học sinh' }}
                </p>
              </div>
              <svg class="hidden md:block w-4 h-4 text-muted-foreground transition-transform" :class="{ 'rotate-180': isProfileOpen }" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>

            <!-- Dropdown Menu -->
            <Transition
              enter-active-class="transition-all duration-200 ease-out"
              enter-from-class="scale-95 opacity-0 -translate-y-2"
              enter-to-class="scale-100 opacity-100 translate-y-0"
              leave-active-class="transition-all duration-150 ease-in"
              leave-from-class="scale-100 opacity-100 translate-y-0"
              leave-to-class="scale-95 opacity-0 -translate-y-2"
            >
              <div
                v-if="isProfileOpen"
                data-profile-menu
                class="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-border bg-card p-2 shadow-xl"
              >
                <!-- User Info -->
                <div class="flex items-center gap-3 p-3 rounded-xl bg-muted/50 mb-2">
                  <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-bold text-lg">
                    {{ authStore.user?.fullName?.charAt(0) || '?' }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-semibold text-foreground truncate">{{ authStore.user?.fullName }}</p>
                    <p class="text-xs text-muted-foreground truncate">{{ authStore.user?.email }}</p>
                  </div>
                </div>

                <div class="space-y-1">
                  <NuxtLink
                    to="/profile"
                    class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                    @click="isProfileOpen = false"
                  >
                    <svg class="w-5 h-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="8" r="4"/>
                      <path d="M20 21a8 8 0 0 0-16 0"/>
                    </svg>
                    <span>Hồ sơ cá nhân</span>
                  </NuxtLink>
                  <NuxtLink
                    to="/settings"
                    class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                    @click="isProfileOpen = false"
                  >
                    <svg class="w-5 h-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                    <span>Cài đặt</span>
                  </NuxtLink>
                </div>

                <div class="my-2 border-t border-border" />

                <button
                  class="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                  @click="handleLogout"
                >
                  <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" x2="9" y1="12" y2="12"/>
                  </svg>
                  <span>Đăng xuất</span>
                </button>
              </div>
            </Transition>
          </div>

          <!-- Mobile menu button -->
          <button
            class="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-muted/50 transition-colors lg:hidden"
            @click="toggleMenu"
          >
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path v-if="!isMenuOpen" d="M4 6h16M4 12h16M4 18h16"/>
              <path v-else d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Mobile Navigation -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-4"
      >
        <div v-if="isMenuOpen" class="border-t border-border py-4 lg:hidden">
          <div class="space-y-1">
            <NuxtLink
              v-for="item in navigation"
              :key="item.name"
              :to="item.href"
              class="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors"
              :class="[
                route.path.startsWith(item.href)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              ]"
            >
              {{ item.name }}
            </NuxtLink>
          </div>
        </div>
      </Transition>
    </div>
  </nav>

  <!-- Search Modal -->
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
        v-if="isSearchOpen"
        class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        @click="isSearchOpen = false"
      >
        <div class="min-h-screen flex items-start justify-center pt-[20vh] px-4" @click.stop>
          <div class="w-full max-w-xl bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div class="flex items-center gap-3 px-4 border-b border-border">
              <svg class="w-5 h-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Tìm kiếm lớp học, bài tập..."
                class="flex-1 h-14 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                autofocus
              />
              <kbd class="px-2 py-1 rounded border border-border bg-muted text-xs text-muted-foreground">ESC</kbd>
            </div>
            <div class="p-4 text-center text-sm text-muted-foreground">
              Nhập từ khóa để tìm kiếm...
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
