<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

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

const getNotificationIcon = (type: string) => {
  const icons: Record<string, { icon: string; bgColor: string; iconColor: string }> = {
    'assignment': {
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    'grade': {
      icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
      bgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-600'
    },
    'live_session': {
      icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
      bgColor: 'bg-red-100',
      iconColor: 'text-red-600'
    },
    'class': {
      icon: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z',
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    'message': {
      icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    'default': {
      icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
      bgColor: 'bg-gray-100',
      iconColor: 'text-gray-600'
    },
  }
  return icons[type] || icons['default']
}

const formatRelativeTime = (date: string) => {
  const now = new Date()
  const notifDate = new Date(date)
  const diff = now.getTime() - notifDate.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  if (hours < 24) return `${hours} giờ trước`
  if (days < 7) return `${days} ngày trước`
  return notifDate.toLocaleDateString('vi-VN')
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
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-gradient-to-br from-primary via-primary/90 to-purple-600 text-white">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold">Thông báo</h1>
            <p class="text-white/80 mt-1">
              Bạn có {{ notificationsStore.unreadCount }} thông báo chưa đọc
            </p>
          </div>
          <button
            v-if="notificationsStore.unreadCount > 0"
            class="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm font-medium transition-all"
            @click="handleMarkAllAsRead"
          >
            Đánh dấu tất cả đã đọc
          </button>
        </div>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <!-- Filters -->
      <div class="bg-white rounded-2xl shadow-sm p-2 flex gap-2 mb-6">
        <button
          v-for="f in [
            { value: 'all', label: 'Tất cả', count: notificationsStore.notifications?.length || 0 },
            { value: 'unread', label: 'Chưa đọc', count: notificationsStore.unreadCount },
          ]"
          :key="f.value"
          class="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
          :class="filter === f.value 
            ? 'bg-primary text-white shadow-lg shadow-primary/25' 
            : 'text-gray-600 hover:bg-gray-100'"
          @click="filter = f.value as any"
        >
          {{ f.label }}
          <span 
            v-if="f.count > 0" 
            class="px-2 py-0.5 rounded-full text-xs"
            :class="filter === f.value ? 'bg-white/20' : 'bg-gray-200'"
          >
            {{ f.count }}
          </span>
        </button>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="space-y-4">
        <div v-for="i in 5" :key="i" class="bg-white rounded-2xl p-5 animate-pulse">
          <div class="flex gap-4">
            <div class="w-12 h-12 rounded-xl bg-gray-200" />
            <div class="flex-1">
              <div class="h-5 w-3/4 bg-gray-200 rounded mb-2" />
              <div class="h-4 w-1/2 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredNotifications.length === 0" class="bg-white rounded-2xl shadow-sm py-16 text-center">
        <div class="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
          <svg class="w-10 h-10 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <h3 class="mt-6 text-lg font-semibold text-gray-900">Không có thông báo</h3>
        <p class="mt-2 text-gray-500">
          {{ filter === 'unread' ? 'Bạn đã đọc hết thông báo rồi!' : 'Chưa có thông báo nào' }}
        </p>
      </div>

      <!-- Notifications List -->
      <TransitionGroup
        v-else
        tag="div"
        class="space-y-3"
        enter-active-class="transition-all duration-300"
        enter-from-class="opacity-0 -translate-x-4"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition-all duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0 -translate-x-4"
      >
        <div
          v-for="notification in filteredNotifications"
          :key="notification.id"
          class="bg-white rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md group"
          :class="!notification.isRead ? 'ring-2 ring-primary/20 bg-primary/5' : ''"
        >
          <div class="p-5">
            <div class="flex gap-4">
              <!-- Icon -->
              <div
                class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                :class="getNotificationIcon(notification.type).bgColor"
              >
                <svg
                  class="w-6 h-6"
                  :class="getNotificationIcon(notification.type).iconColor"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" :d="getNotificationIcon(notification.type).icon" />
                </svg>
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <div class="flex items-center gap-2">
                      <p class="font-semibold text-gray-900">
                        {{ notification.title }}
                      </p>
                      <span 
                        v-if="!notification.isRead"
                        class="w-2 h-2 rounded-full bg-primary animate-pulse"
                      />
                    </div>
                    <p class="text-gray-600 text-sm mt-1">
                      {{ notification.content }}
                    </p>
                    <p class="text-gray-400 text-xs mt-2">
                      {{ formatRelativeTime(notification.createdAt) }}
                    </p>
                  </div>

                  <!-- Actions -->
                  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      v-if="!notification.isRead"
                      class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-green-100 hover:text-green-600 transition-colors"
                      title="Đánh dấu đã đọc"
                      @click="handleMarkAsRead(notification.id)"
                    >
                      <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>
                    <button
                      class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                      title="Xóa"
                      @click="handleDelete(notification.id)"
                    >
                      <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Unread indicator bar -->
          <div v-if="!notification.isRead" class="h-1 bg-gradient-to-r from-primary to-purple-500" />
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>
