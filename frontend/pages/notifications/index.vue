<script setup lang="ts">
const notificationsStore = useNotificationsStore()
const { toast } = useToast()

const isLoading = ref(true)
const filter = ref<'all' | 'unread'>('all')

const filteredNotifications = computed(() => {
  if (filter.value === 'unread') {
    return notificationsStore.unreadNotifications
  }
  return notificationsStore.notifications
})

const getIconPath = (type: string) => {
  const icons: Record<string, string> = {
    'assignment': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    'grade': 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    'live_session': 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
    'class': 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z',
    'default': 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  }
  return icons[type] || icons['default']
}

const handleMarkAsRead = async (id: number) => {
  try {
    await notificationsStore.markAsRead([id])
  } catch (error) {
    toast.error('Không thể đánh dấu đã đọc')
  }
}

const handleMarkAllAsRead = async () => {
  try {
    await notificationsStore.markAllAsRead()
    toast.success('Đã đánh dấu tất cả đã đọc')
  } catch (error) {
    toast.error('Không thể đánh dấu đã đọc')
  }
}

const handleDelete = async (id: number) => {
  try {
    await notificationsStore.deleteNotification(id)
    toast.success('Đã xóa thông báo')
  } catch (error) {
    toast.error('Không thể xóa thông báo')
  }
}

onMounted(async () => {
  try {
    await notificationsStore.fetchNotifications()
  } catch (error) {
    toast.error('Không thể tải thông báo')
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
        <h1 class="text-2xl font-bold tracking-tight">Thông báo</h1>
        <p class="text-muted-foreground">
          Bạn có {{ notificationsStore.unreadCount }} thông báo chưa đọc
        </p>
      </div>
      <div class="flex gap-2">
        <UiButton
          v-if="notificationsStore.unreadCount > 0"
          variant="outline"
          size="sm"
          @click="handleMarkAllAsRead"
        >
          Đánh dấu tất cả đã đọc
        </UiButton>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex gap-2">
      <button
        v-for="f in [
          { value: 'all', label: 'Tất cả' },
          { value: 'unread', label: 'Chưa đọc' },
        ]"
        :key="f.value"
        class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        :class="filter === f.value ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'"
        @click="filter = f.value as any"
      >
        {{ f.label }}
        <span v-if="f.value === 'unread' && notificationsStore.unreadCount > 0" class="ml-1">
          ({{ notificationsStore.unreadCount }})
        </span>
      </button>
    </div>

    <!-- Notifications List -->
    <div v-if="isLoading" class="space-y-4">
      <UiCard v-for="i in 5" :key="i">
        <UiCardContent class="p-4">
          <div class="flex gap-4">
            <UiSkeleton class="h-10 w-10" variant="circular" />
            <div class="flex-1">
              <UiSkeleton class="mb-2 h-5 w-3/4" />
              <UiSkeleton class="h-4 w-1/2" />
            </div>
          </div>
        </UiCardContent>
      </UiCard>
    </div>

    <div v-else-if="filteredNotifications.length === 0" class="py-12 text-center">
      <svg class="mx-auto h-16 w-16 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      <h3 class="mt-4 text-lg font-semibold">Không có thông báo</h3>
      <p class="mt-1 text-muted-foreground">
        {{ filter === 'unread' ? 'Bạn đã đọc hết thông báo' : 'Chưa có thông báo nào' }}
      </p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="notification in filteredNotifications"
        :key="notification.id"
        class="rounded-lg border p-4 transition-colors"
        :class="notification.isRead ? 'bg-background' : 'bg-primary/5 border-primary/20'"
      >
        <div class="flex gap-4">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            :class="notification.isRead ? 'bg-muted' : 'bg-primary/10'"
          >
            <svg
              class="h-5 w-5"
              :class="notification.isRead ? 'text-muted-foreground' : 'text-primary'"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" :d="getIconPath(notification.type)" />
            </svg>
          </div>
          <div class="flex-1">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="font-medium" :class="{ 'text-foreground': !notification.isRead }">
                  {{ notification.title }}
                </p>
                <p class="mt-1 text-sm text-muted-foreground">
                  {{ notification.content }}
                </p>
                <p class="mt-2 text-xs text-muted-foreground">
                  {{ new Date(notification.createdAt).toLocaleString('vi-VN') }}
                </p>
              </div>
              <div class="flex gap-1">
                <button
                  v-if="!notification.isRead"
                  class="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  title="Đánh dấu đã đọc"
                  @click="handleMarkAsRead(notification.id)"
                >
                  <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
                <button
                  class="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Xóa"
                  @click="handleDelete(notification.id)"
                >
                  <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
