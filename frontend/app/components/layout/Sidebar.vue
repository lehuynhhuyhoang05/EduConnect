<script setup lang="ts">
const route = useRoute()
const authStore = useAuthStore()
const notificationsStore = useNotificationsStore()

interface SidebarItem {
  name: string
  href: string
  icon: string
  badge?: number | (() => number)
}

const props = defineProps<{
  items?: SidebarItem[]
  title?: string
  collapsed?: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle'): void
}>()

const isCollapsed = ref(props.collapsed || false)

const defaultItems = computed<SidebarItem[]>(() => [
  { name: 'Tổng quan', href: '/dashboard', icon: 'home' },
  { name: 'Lớp học', href: '/classes', icon: 'academic-cap' },
  { name: 'Bài tập', href: '/assignments', icon: 'clipboard' },
  { name: 'Lịch học', href: '/schedule', icon: 'calendar' },
  { name: 'Tin nhắn', href: '/messages', icon: 'chat' },
  { name: 'Thông báo', href: '/notifications', icon: 'bell', badge: () => notificationsStore.unreadCount },
  { name: 'Cài đặt', href: '/settings', icon: 'settings' },
])

const items = computed(() => props.items || defaultItems.value)

const getBadgeValue = (badge: number | (() => number) | undefined) => {
  if (!badge) return 0
  return typeof badge === 'function' ? badge() : badge
}

const getIcon = (icon: string) => {
  const icons: Record<string, string> = {
    'home': 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    'academic-cap': 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222',
    'clipboard': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
    'calendar': 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    'chat': 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    'bell': 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    'settings': 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
  }
  return icons[icon] || icons['home']
}

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
  emit('toggle')
}
</script>

<template>
  <aside 
    class="flex h-full flex-col bg-white border-r border-gray-200 transition-all duration-300"
    :class="isCollapsed ? 'w-20' : 'w-64'"
  >
    <!-- Header with Logo -->
    <div class="h-16 flex items-center justify-between px-4 border-b border-gray-100">
      <NuxtLink to="/dashboard" class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/25">
          <span class="text-white font-bold text-lg">L</span>
        </div>
        <Transition
          enter-active-class="transition-all duration-200"
          enter-from-class="opacity-0 -translate-x-2"
          enter-to-class="opacity-100 translate-x-0"
          leave-active-class="transition-all duration-150"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <span v-if="!isCollapsed" class="font-bold text-xl text-gray-900">LMS</span>
        </Transition>
      </NuxtLink>
      
      <button 
        class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
        :class="isCollapsed ? 'mx-auto' : ''"
        @click="toggleCollapse"
      >
        <svg 
          class="w-4 h-4 text-gray-500 transition-transform duration-300"
          :class="isCollapsed ? 'rotate-180' : ''"
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2"
        >
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </button>
    </div>

    <!-- User Info (collapsed shows avatar only) -->
    <div class="p-4 border-b border-gray-100">
      <div 
        class="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100"
        :class="isCollapsed ? 'justify-center' : ''"
      >
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
          {{ authStore.user?.fullName?.charAt(0) || 'U' }}
        </div>
        <Transition
          enter-active-class="transition-all duration-200"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="transition-all duration-150"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div v-if="!isCollapsed" class="flex-1 min-w-0">
            <p class="font-semibold text-gray-900 text-sm truncate">{{ authStore.user?.fullName || 'Người dùng' }}</p>
            <p class="text-xs text-gray-500 truncate">{{ authStore.isTeacher ? 'Giáo viên' : authStore.isStudent ? 'Học sinh' : 'Quản trị' }}</p>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
      <NuxtLink
        v-for="item in items"
        :key="item.name"
        :to="item.href"
        class="group relative flex items-center justify-between rounded-xl text-sm font-medium transition-all duration-200"
        :class="[
          route.path.startsWith(item.href)
            ? 'bg-primary text-white shadow-lg shadow-primary/25'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
          isCollapsed ? 'p-3 justify-center' : 'px-4 py-3'
        ]"
      >
        <div class="flex items-center gap-3">
          <svg
            class="w-5 h-5 flex-shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" :d="getIcon(item.icon)" />
          </svg>
          <Transition
            enter-active-class="transition-all duration-200"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition-all duration-150"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <span v-if="!isCollapsed">{{ item.name }}</span>
          </Transition>
        </div>
        
        <!-- Badge -->
        <span
          v-if="getBadgeValue(item.badge) > 0"
          class="rounded-full text-xs font-medium flex items-center justify-center"
          :class="[
            route.path.startsWith(item.href)
              ? 'bg-white/20 text-white'
              : 'bg-primary/10 text-primary',
            isCollapsed ? 'absolute -top-1 -right-1 w-5 h-5' : 'px-2 py-0.5'
          ]"
        >
          {{ getBadgeValue(item.badge) > 99 ? '99+' : getBadgeValue(item.badge) }}
        </span>

        <!-- Tooltip for collapsed state -->
        <div 
          v-if="isCollapsed"
          class="absolute left-full ml-3 px-3 py-2 rounded-lg bg-gray-900 text-white text-sm whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50"
        >
          {{ item.name }}
          <div class="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
        </div>
      </NuxtLink>
    </nav>

    <!-- Footer -->
    <div class="p-3 border-t border-gray-100">
      <slot name="footer">
        <NuxtLink
          to="/settings"
          class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          :class="isCollapsed ? 'justify-center px-3' : ''"
        >
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <Transition
            enter-active-class="transition-all duration-200"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition-all duration-150"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <span v-if="!isCollapsed">Đăng xuất</span>
          </Transition>
        </NuxtLink>
      </slot>
    </div>
  </aside>
</template>
