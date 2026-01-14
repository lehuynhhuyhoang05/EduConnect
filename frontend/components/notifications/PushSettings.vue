<script setup lang="ts">
const { 
  isSupported, 
  isSubscribed, 
  isLoading, 
  permission,
  toggle,
  init 
} = usePushNotifications()

onMounted(async () => {
  await init()
})
</script>

<template>
  <div class="rounded-lg border bg-card p-6 shadow-sm">
    <div class="flex items-start justify-between gap-4">
      <div class="flex items-start gap-4">
        <div class="rounded-lg bg-primary/10 p-3">
          <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div>
          <h3 class="font-semibold">Push Notifications</h3>
          <p class="text-sm text-muted-foreground mt-1">
            Nhận thông báo trực tiếp trên thiết bị khi có cập nhật mới
          </p>
          
          <!-- Status -->
          <div class="mt-2 text-sm">
            <span v-if="!isSupported" class="text-orange-500">
              ⚠️ Trình duyệt không hỗ trợ Push Notifications
            </span>
            <span v-else-if="permission === 'denied'" class="text-red-500">
              🚫 Bạn đã từ chối quyền thông báo. Vui lòng bật lại trong cài đặt trình duyệt.
            </span>
            <span v-else-if="isSubscribed" class="text-green-500">
              ✓ Đã đăng ký nhận thông báo
            </span>
            <span v-else class="text-muted-foreground">
              Chưa đăng ký nhận thông báo
            </span>
          </div>
        </div>
      </div>
      
      <button
        @click="toggle"
        :disabled="!isSupported || permission === 'denied' || isLoading"
        :class="[
          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          isSubscribed ? 'bg-primary' : 'bg-muted',
          (!isSupported || permission === 'denied') && 'opacity-50 cursor-not-allowed'
        ]"
      >
        <span
          :class="[
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
            isSubscribed ? 'translate-x-5' : 'translate-x-0'
          ]"
        />
      </button>
    </div>

    <!-- Info about notifications -->
    <div class="mt-4 pt-4 border-t space-y-2">
      <p class="text-xs text-muted-foreground font-medium">Bạn sẽ nhận thông báo về:</p>
      <ul class="text-xs text-muted-foreground space-y-1">
        <li class="flex items-center gap-2">
          <svg class="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
          Bài tập mới và deadline sắp đến
        </li>
        <li class="flex items-center gap-2">
          <svg class="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
          Live sessions bắt đầu
        </li>
        <li class="flex items-center gap-2">
          <svg class="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
          Điểm số mới và phản hồi từ giáo viên
        </li>
        <li class="flex items-center gap-2">
          <svg class="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
          Sự kiện lịch và nhắc nhở
        </li>
      </ul>
    </div>
  </div>
</template>
