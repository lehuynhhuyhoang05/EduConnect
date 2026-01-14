<script setup lang="ts">
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const isMenuOpen = ref(false)
const isProfileOpen = ref(false)

const navigation = computed(() => {
  const items = [
    { name: 'Dashboard', href: '/dashboard', icon: 'home' },
    { name: 'Lớp học', href: '/classes', icon: 'academic-cap' },
  ]

  if (authStore.isTeacher) {
    items.push({ name: 'Bài tập', href: '/assignments', icon: 'clipboard-list' })
  }

  items.push(
    { name: 'Lịch', href: '/calendar', icon: 'calendar' },
    { name: 'Thông báo', href: '/notifications', icon: 'bell' },
  )

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

// Close menu on route change
watch(() => route.path, closeMenu)
</script>

<template>
  <nav class="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <div class="container mx-auto px-4">
      <div class="flex h-16 items-center justify-between">
        <!-- Logo & Brand -->
        <div class="flex items-center gap-4">
          <NuxtLink to="/dashboard" class="flex items-center gap-2">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2v-5" />
              </svg>
            </div>
            <span class="hidden font-bold sm:inline-block">EduLMS</span>
          </NuxtLink>

          <!-- Desktop Navigation -->
          <div class="hidden md:flex md:items-center md:gap-1">
            <NuxtLink
              v-for="item in navigation"
              :key="item.name"
              :to="item.href"
              class="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              :class="[
                route.path.startsWith(item.href)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              ]"
            >
              {{ item.name }}
            </NuxtLink>
          </div>
        </div>

        <!-- Right side -->
        <div class="flex items-center gap-2">
          <!-- Notifications -->
          <NuxtLink
            to="/notifications"
            class="relative rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            <span class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              3
            </span>
          </NuxtLink>

          <!-- Profile Dropdown -->
          <div class="relative">
            <button
              class="flex items-center gap-2 rounded-lg p-1 hover:bg-accent"
              @click="isProfileOpen = !isProfileOpen"
            >
              <UiAvatar
                :src="authStore.user?.avatarUrl"
                :alt="authStore.user?.fullName"
                size="sm"
              />
              <span class="hidden text-sm font-medium md:inline-block">
                {{ authStore.user?.fullName }}
              </span>
              <svg class="hidden h-4 w-4 md:block" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            <!-- Dropdown Menu -->
            <Transition
              enter-active-class="transition-all duration-200"
              enter-from-class="scale-95 opacity-0"
              enter-to-class="scale-100 opacity-100"
              leave-active-class="transition-all duration-150"
              leave-from-class="scale-100 opacity-100"
              leave-to-class="scale-95 opacity-0"
            >
              <div
                v-if="isProfileOpen"
                class="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border bg-popover p-1 shadow-lg"
                @click="isProfileOpen = false"
              >
                <div class="px-3 py-2">
                  <p class="text-sm font-medium">{{ authStore.user?.fullName }}</p>
                  <p class="text-xs text-muted-foreground">{{ authStore.user?.email }}</p>
                </div>
                <hr class="my-1 border-border" />
                <NuxtLink
                  to="/profile"
                  class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent"
                >
                  <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Hồ sơ
                </NuxtLink>
                <NuxtLink
                  to="/settings"
                  class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent"
                >
                  <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Cài đặt
                </NuxtLink>
                <hr class="my-1 border-border" />
                <button
                  class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                  @click="handleLogout"
                >
                  <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" x2="9" y1="12" y2="12" />
                  </svg>
                  Đăng xuất
                </button>
              </div>
            </Transition>
          </div>

          <!-- Mobile menu button -->
          <button
            class="rounded-lg p-2 md:hidden"
            @click="toggleMenu"
          >
            <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path v-if="!isMenuOpen" d="M4 6h16M4 12h16M4 18h16" />
              <path v-else d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Mobile Navigation -->
      <Transition
        enter-active-class="transition-all duration-200"
        enter-from-class="-translate-y-2 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition-all duration-150"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="-translate-y-2 opacity-0"
      >
        <div v-if="isMenuOpen" class="border-t pb-4 md:hidden">
          <div class="mt-2 space-y-1">
            <NuxtLink
              v-for="item in navigation"
              :key="item.name"
              :to="item.href"
              class="block rounded-lg px-3 py-2 text-base font-medium"
              :class="[
                route.path.startsWith(item.href)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent',
              ]"
            >
              {{ item.name }}
            </NuxtLink>
          </div>
        </div>
      </Transition>
    </div>
  </nav>
</template>
