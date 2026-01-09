<script setup lang="ts">
const authStore = useAuthStore()
const { toast } = useToast()

const form = reactive({
  fullName: authStore.user?.fullName || '',
  email: authStore.user?.email || '',
  bio: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const isEditing = ref(false)
const isChangingPassword = ref(false)
const isSaving = ref(false)

const handleUpdateProfile = async () => {
  isSaving.value = true
  try {
    // Simulated API call - replace with actual API
    await new Promise(resolve => setTimeout(resolve, 1000))
    toast.success('Cập nhật thành công! Thông tin cá nhân đã được cập nhật')
    isEditing.value = false
  } catch (error: any) {
    toast.error(error.message || 'Cập nhật thất bại, vui lòng thử lại')
  } finally {
    isSaving.value = false
  }
}

const handleChangePassword = async () => {
  if (form.newPassword !== form.confirmPassword) {
    toast.error('Mật khẩu xác nhận không khớp')
    return
  }
  
  isSaving.value = true
  try {
    // Simulated API call - replace with actual API
    await new Promise(resolve => setTimeout(resolve, 1000))
    toast.success('Đổi mật khẩu thành công!')
    form.currentPassword = ''
    form.newPassword = ''
    form.confirmPassword = ''
    isChangingPassword.value = false
  } catch (error: any) {
    toast.error(error.message || 'Đổi mật khẩu thất bại, vui lòng thử lại')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold text-foreground">Hồ sơ cá nhân</h1>
      <p class="text-muted-foreground mt-1">Quản lý thông tin tài khoản của bạn</p>
    </div>

    <!-- Profile Card -->
    <div class="rounded-2xl border border-border bg-card overflow-hidden">
      <!-- Banner -->
      <div class="h-32 bg-gradient-to-r from-primary via-primary/90 to-primary/80 relative">
        <div class="absolute -bottom-16 left-8">
          <div class="h-32 w-32 rounded-2xl border-4 border-card bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold shadow-xl">
            {{ authStore.user?.fullName?.charAt(0) || 'U' }}
          </div>
        </div>
      </div>

      <!-- Profile Info -->
      <div class="p-8 pt-20">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h2 class="text-2xl font-bold text-foreground">{{ authStore.user?.fullName }}</h2>
            <div class="flex items-center gap-4 mt-2">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {{ authStore.isTeacher ? 'Giáo viên' : 'Học sinh' }}
              </span>
              <span class="text-sm text-muted-foreground">{{ authStore.user?.email }}</span>
            </div>
          </div>
          
          <button
            @click="isEditing = !isEditing"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:bg-muted transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {{ isEditing ? 'Hủy' : 'Chỉnh sửa' }}
          </button>
        </div>

        <!-- Edit Form -->
        <div v-if="isEditing" class="space-y-6">
          <div class="grid sm:grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-sm font-medium text-foreground">Họ và tên</label>
              <input
                v-model="form.fullName"
                type="text"
                class="w-full h-11 px-4 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium text-foreground">Email</label>
              <input
                v-model="form.email"
                type="email"
                disabled
                class="w-full h-11 px-4 rounded-xl border border-input bg-muted text-muted-foreground cursor-not-allowed"
              />
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium text-foreground">Vai trò</label>
              <input
                :value="authStore.isTeacher ? 'Giáo viên' : 'Học sinh'"
                disabled
                class="w-full h-11 px-4 rounded-xl border border-input bg-muted text-muted-foreground cursor-not-allowed"
              />
            </div>
          </div>

          <div class="flex justify-end gap-3">
            <button
              @click="isEditing = false"
              class="px-4 py-2 rounded-xl border border-border hover:bg-muted transition-colors"
            >
              Hủy
            </button>
            <button
              @click="handleUpdateProfile"
              :disabled="isSaving"
              class="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {{ isSaving ? 'Đang lưu...' : 'Lưu thay đổi' }}
            </button>
          </div>
        </div>

        <!-- View Mode Stats -->
        <div v-else class="grid sm:grid-cols-3 gap-4">
          <div class="rounded-xl border border-border p-4">
            <div class="text-2xl font-bold text-foreground">12</div>
            <div class="text-sm text-muted-foreground">Lớp học</div>
          </div>
          <div class="rounded-xl border border-border p-4">
            <div class="text-2xl font-bold text-foreground">48</div>
            <div class="text-sm text-muted-foreground">Bài tập hoàn thành</div>
          </div>
          <div class="rounded-xl border border-border p-4">
            <div class="text-2xl font-bold text-foreground">92%</div>
            <div class="text-sm text-muted-foreground">Tỷ lệ hoàn thành</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Security Section -->
    <div class="rounded-2xl border border-border bg-card overflow-hidden">
      <div class="p-6 border-b border-border">
        <h3 class="font-semibold text-foreground flex items-center gap-2">
          <svg class="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Bảo mật
        </h3>
      </div>

      <div class="p-6 space-y-4">
        <button
          @click="isChangingPassword = !isChangingPassword"
          class="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/50 transition-all"
        >
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <svg class="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div class="text-left">
              <div class="font-medium text-foreground">Đổi mật khẩu</div>
              <div class="text-sm text-muted-foreground">Cập nhật mật khẩu của bạn</div>
            </div>
          </div>
          <svg 
            class="w-5 h-5 text-muted-foreground transition-transform"
            :class="{ 'rotate-180': isChangingPassword }"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- Change Password Form -->
        <div v-if="isChangingPassword" class="space-y-4 pt-4">
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">Mật khẩu hiện tại</label>
            <input
              v-model="form.currentPassword"
              type="password"
              placeholder="Nhập mật khẩu hiện tại"
              class="w-full h-11 px-4 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">Mật khẩu mới</label>
            <input
              v-model="form.newPassword"
              type="password"
              placeholder="Nhập mật khẩu mới"
              class="w-full h-11 px-4 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">Xác nhận mật khẩu mới</label>
            <input
              v-model="form.confirmPassword"
              type="password"
              placeholder="Nhập lại mật khẩu mới"
              class="w-full h-11 px-4 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button
              @click="isChangingPassword = false"
              class="px-4 py-2 rounded-xl border border-border hover:bg-muted transition-colors"
            >
              Hủy
            </button>
            <button
              @click="handleChangePassword"
              :disabled="isSaving"
              class="px-4 py-2 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {{ isSaving ? 'Đang cập nhật...' : 'Đổi mật khẩu' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
