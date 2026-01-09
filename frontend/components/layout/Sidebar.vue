<script setup lang="ts">
const route = useRoute()

interface SidebarItem {
  name: string
  href: string
  icon: string
  badge?: number
}

const props = defineProps<{
  items?: SidebarItem[]
  title?: string
}>()

const defaultItems: SidebarItem[] = [
  { name: 'Tổng quan', href: '/dashboard', icon: 'home' },
  { name: 'Lớp học', href: '/classes', icon: 'academic-cap' },
  { name: 'Bài tập', href: '/assignments', icon: 'clipboard' },
  { name: 'Lịch học', href: '/schedule', icon: 'calendar' },
  { name: 'Tin nhắn', href: '/messages', icon: 'chat', badge: 5 },
  { name: 'Thông báo', href: '/notifications', icon: 'bell', badge: 12 },
]

const items = computed(() => props.items || defaultItems)

const getIcon = (icon: string) => {
  const icons: Record<string, string> = {
    'home': 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    'academic-cap': 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222',
    'clipboard': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
    'calendar': 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    'chat': 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    'bell': 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  }
  return icons[icon] || icons['home']
}
</script>

<template>
  <aside class="flex h-full w-64 flex-col border-r bg-card">
    <!-- Header -->
    <div v-if="title" class="border-b px-4 py-4">
      <h2 class="font-semibold">{{ title }}</h2>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 space-y-1 p-4">
      <NuxtLink
        v-for="item in items"
        :key="item.name"
        :to="item.href"
        class="group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors"
        :class="[
          route.path.startsWith(item.href)
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        ]"
      >
        <div class="flex items-center gap-3">
          <svg
            class="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" :d="getIcon(item.icon)" />
          </svg>
          <span>{{ item.name }}</span>
        </div>
        <span
          v-if="item.badge"
          class="rounded-full px-2 py-0.5 text-xs font-medium"
          :class="[
            route.path.startsWith(item.href)
              ? 'bg-primary-foreground/20 text-primary-foreground'
              : 'bg-primary/10 text-primary',
          ]"
        >
          {{ item.badge > 99 ? '99+' : item.badge }}
        </span>
      </NuxtLink>
    </nav>

    <!-- Footer -->
    <div class="border-t p-4">
      <slot name="footer" />
    </div>
  </aside>
</template>
