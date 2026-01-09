<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const router = useRouter()
const { toast } = useToast()
const authStore = useAuthStore()

const activeTab = ref('profile')

const tabs = [
  { id: 'profile', label: 'Hồ sơ', icon: 'user' },
  { id: 'account', label: 'Tài khoản', icon: 'settings' },
  { id: 'notifications', label: 'Thông báo', icon: 'bell' },
  { id: 'security', label: 'Bảo mật', icon: 'shield' },
]

// Profile form
const profileForm = reactive({
  fullName: authStore.user?.fullName || '',
  email: authStore.user?.email || '',
  phone: '',
  bio: '',
  avatar: null as File | null,
})

const avatarPreview = ref('')

// Notification settings
const notificationSettings = reactive({
  emailNewAssignment: true,
  emailGradePosted: true,
  emailLiveSession: true,
  emailClassAnnouncement: true,
  pushNewMessage: true,
  pushLiveSessionReminder: true,
  pushDeadlineReminder: true,
})

// Security form
const securityForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const passwordStrength = computed(() => {
  const password = securityForm.newPassword
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return score
})

const passwordStrengthLabel = computed(() => {
  const labels = ['', 'Yếu', 'Trung bình', 'Khá', 'Mạnh', 'Rất mạnh']
  return labels[passwordStrength.value]
})

const passwordStrengthColor = computed(() => {
  const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500']
  return colors[passwordStrength.value]
})

const isSaving = ref(false)

const handleAvatarChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    profileForm.avatar = file
    avatarPreview.value = URL.createObjectURL(file)
  }
}

const saveProfile = async () => {
  isSaving.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
    toast.success('Đã cập nhật hồ sơ thành công')
  } catch (error) {
    toast.error('Không thể cập nhật hồ sơ')
  } finally {
    isSaving.value = false
  }
}

const saveNotifications = async () => {
  isSaving.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
    toast.success('Đã lưu cài đặt thông báo')
  } catch (error) {
    toast.error('Không thể lưu cài đặt')
  } finally {
    isSaving.value = false
  }
}

const changePassword = async () => {
  if (securityForm.newPassword !== securityForm.confirmPassword) {
    toast.error('Mật khẩu xác nhận không khớp')
    return
  }
  
  if (passwordStrength.value < 3) {
    toast.error('Vui lòng chọn mật khẩu mạnh hơn')
    return
  }

  isSaving.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
    toast.success('Đã đổi mật khẩu thành công')
    securityForm.currentPassword = ''
    securityForm.newPassword = ''
    securityForm.confirmPassword = ''
  } catch (error) {
    toast.error('Không thể đổi mật khẩu')
  } finally {
    isSaving.value = false
  }
}

const logout = async () => {
  await authStore.logout()
  router.push('/auth/login')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-gradient-to-br from-primary via-primary/90 to-purple-600 text-white">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 class="text-2xl font-bold">Cài đặt</h1>
        <p class="text-white/80 mt-1">Quản lý tài khoản và tùy chọn của bạn</p>
      </div>
    </div>

    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex flex-col lg:flex-row gap-8">
        <!-- Sidebar -->
        <div class="lg:w-64 flex-shrink-0">
          <nav class="bg-white rounded-2xl shadow-sm p-2">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors"
              :class="activeTab === tab.id 
                ? 'bg-primary text-white' 
                : 'text-gray-700 hover:bg-gray-100'"
              @click="activeTab = tab.id"
            >
              <!-- User icon -->
              <svg v-if="tab.icon === 'user'" class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <!-- Settings icon -->
              <svg v-else-if="tab.icon === 'settings'" class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              <!-- Bell icon -->
              <svg v-else-if="tab.icon === 'bell'" class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <!-- Shield icon -->
              <svg v-else-if="tab.icon === 'shield'" class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span class="font-medium">{{ tab.label }}</span>
            </button>

            <hr class="my-2 border-gray-200">

            <button
              class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
              @click="logout"
            >
              <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span class="font-medium">Đăng xuất</span>
            </button>
          </nav>
        </div>

        <!-- Content -->
        <div class="flex-1">
          <!-- Profile Tab -->
          <div v-if="activeTab === 'profile'" class="bg-white rounded-2xl shadow-sm p-6">
            <h2 class="text-xl font-bold text-gray-900 mb-6">Thông tin hồ sơ</h2>

            <form class="space-y-6" @submit.prevent="saveProfile">
              <!-- Avatar -->
              <div class="flex items-center gap-6">
                <div class="relative">
                  <div class="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-primary to-purple-600">
                    <img
                      v-if="avatarPreview"
                      :src="avatarPreview"
                      alt="Avatar"
                      class="w-full h-full object-cover"
                    />
                    <div v-else class="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                      {{ authStore.user?.fullName?.charAt(0) || 'U' }}
                    </div>
                  </div>
                  <label class="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-lg">
                    <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <input
                      type="file"
                      accept="image/*"
                      class="hidden"
                      @change="handleAvatarChange"
                    />
                  </label>
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900">{{ authStore.user?.fullName }}</h3>
                  <p class="text-sm text-gray-500">{{ authStore.user?.email }}</p>
                  <p class="text-xs text-gray-400 mt-1">JPG, PNG hoặc GIF. Tối đa 2MB</p>
                </div>
              </div>

              <!-- Full Name -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Họ và tên</label>
                <input
                  v-model="profileForm.fullName"
                  type="text"
                  class="w-full h-12 px-4 rounded-xl border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Nhập họ và tên"
                />
              </div>

              <!-- Email -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  v-model="profileForm.email"
                  type="email"
                  class="w-full h-12 px-4 rounded-xl border border-gray-300 bg-gray-50 text-gray-500"
                  disabled
                />
                <p class="text-xs text-gray-400 mt-1">Email không thể thay đổi</p>
              </div>

              <!-- Phone -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Số điện thoại</label>
                <input
                  v-model="profileForm.phone"
                  type="tel"
                  class="w-full h-12 px-4 rounded-xl border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Nhập số điện thoại"
                />
              </div>

              <!-- Bio -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Giới thiệu</label>
                <textarea
                  v-model="profileForm.bio"
                  rows="4"
                  class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  placeholder="Viết vài dòng về bản thân..."
                />
              </div>

              <div class="flex justify-end">
                <button
                  type="submit"
                  :disabled="isSaving"
                  class="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium transition-colors disabled:opacity-50"
                >
                  <span v-if="isSaving">Đang lưu...</span>
                  <span v-else>Lưu thay đổi</span>
                </button>
              </div>
            </form>
          </div>

          <!-- Account Tab -->
          <div v-else-if="activeTab === 'account'" class="space-y-6">
            <div class="bg-white rounded-2xl shadow-sm p-6">
              <h2 class="text-xl font-bold text-gray-900 mb-6">Thông tin tài khoản</h2>

              <div class="space-y-4">
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p class="font-medium text-gray-900">Vai trò</p>
                    <p class="text-sm text-gray-500">Quyền hạn của bạn trong hệ thống</p>
                  </div>
                  <span class="px-4 py-2 rounded-full text-sm font-medium" :class="{
                    'bg-purple-100 text-purple-700': authStore.isAdmin,
                    'bg-blue-100 text-blue-700': authStore.isTeacher,
                    'bg-green-100 text-green-700': authStore.isStudent,
                  }">
                    {{ authStore.isAdmin ? 'Quản trị viên' : authStore.isTeacher ? 'Giáo viên' : 'Học sinh' }}
                  </span>
                </div>

                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p class="font-medium text-gray-900">Ngày tham gia</p>
                    <p class="text-sm text-gray-500">Thời gian bạn tạo tài khoản</p>
                  </div>
                  <span class="text-gray-700">{{ new Date().toLocaleDateString('vi-VN') }}</span>
                </div>

                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p class="font-medium text-gray-900">Trạng thái tài khoản</p>
                    <p class="text-sm text-gray-500">Tình trạng hoạt động</p>
                  </div>
                  <span class="px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-700">
                    Đang hoạt động
                  </span>
                </div>
              </div>
            </div>

            <!-- Danger Zone -->
            <div class="bg-white rounded-2xl shadow-sm p-6 border-2 border-red-100">
              <h2 class="text-xl font-bold text-red-600 mb-2">Vùng nguy hiểm</h2>
              <p class="text-gray-500 text-sm mb-6">Các hành động không thể hoàn tác</p>

              <div class="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                <div>
                  <p class="font-medium text-gray-900">Xóa tài khoản</p>
                  <p class="text-sm text-gray-500">Xóa vĩnh viễn tài khoản và tất cả dữ liệu</p>
                </div>
                <button class="px-4 py-2 rounded-xl border-2 border-red-500 text-red-600 font-medium hover:bg-red-500 hover:text-white transition-colors">
                  Xóa tài khoản
                </button>
              </div>
            </div>
          </div>

          <!-- Notifications Tab -->
          <div v-else-if="activeTab === 'notifications'" class="bg-white rounded-2xl shadow-sm p-6">
            <h2 class="text-xl font-bold text-gray-900 mb-6">Cài đặt thông báo</h2>

            <form class="space-y-8" @submit.prevent="saveNotifications">
              <!-- Email Notifications -->
              <div>
                <h3 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg class="w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  Thông báo qua Email
                </h3>
                <div class="space-y-4">
                  <label class="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                    <div>
                      <p class="font-medium text-gray-900">Bài tập mới</p>
                      <p class="text-sm text-gray-500">Nhận email khi có bài tập mới</p>
                    </div>
                    <input
                      v-model="notificationSettings.emailNewAssignment"
                      type="checkbox"
                      class="w-5 h-5 text-primary rounded focus:ring-primary"
                    />
                  </label>

                  <label class="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                    <div>
                      <p class="font-medium text-gray-900">Điểm số</p>
                      <p class="text-sm text-gray-500">Nhận email khi có điểm mới</p>
                    </div>
                    <input
                      v-model="notificationSettings.emailGradePosted"
                      type="checkbox"
                      class="w-5 h-5 text-primary rounded focus:ring-primary"
                    />
                  </label>

                  <label class="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                    <div>
                      <p class="font-medium text-gray-900">Buổi học trực tuyến</p>
                      <p class="text-sm text-gray-500">Nhận email khi có buổi học mới</p>
                    </div>
                    <input
                      v-model="notificationSettings.emailLiveSession"
                      type="checkbox"
                      class="w-5 h-5 text-primary rounded focus:ring-primary"
                    />
                  </label>

                  <label class="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                    <div>
                      <p class="font-medium text-gray-900">Thông báo lớp học</p>
                      <p class="text-sm text-gray-500">Nhận email thông báo từ lớp</p>
                    </div>
                    <input
                      v-model="notificationSettings.emailClassAnnouncement"
                      type="checkbox"
                      class="w-5 h-5 text-primary rounded focus:ring-primary"
                    />
                  </label>
                </div>
              </div>

              <!-- Push Notifications -->
              <div>
                <h3 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg class="w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  Thông báo đẩy
                </h3>
                <div class="space-y-4">
                  <label class="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                    <div>
                      <p class="font-medium text-gray-900">Tin nhắn mới</p>
                      <p class="text-sm text-gray-500">Nhận thông báo khi có tin nhắn</p>
                    </div>
                    <input
                      v-model="notificationSettings.pushNewMessage"
                      type="checkbox"
                      class="w-5 h-5 text-primary rounded focus:ring-primary"
                    />
                  </label>

                  <label class="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                    <div>
                      <p class="font-medium text-gray-900">Nhắc nhở buổi học</p>
                      <p class="text-sm text-gray-500">Nhận nhắc nhở trước buổi học</p>
                    </div>
                    <input
                      v-model="notificationSettings.pushLiveSessionReminder"
                      type="checkbox"
                      class="w-5 h-5 text-primary rounded focus:ring-primary"
                    />
                  </label>

                  <label class="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                    <div>
                      <p class="font-medium text-gray-900">Nhắc nhở deadline</p>
                      <p class="text-sm text-gray-500">Nhận nhắc nhở trước deadline</p>
                    </div>
                    <input
                      v-model="notificationSettings.pushDeadlineReminder"
                      type="checkbox"
                      class="w-5 h-5 text-primary rounded focus:ring-primary"
                    />
                  </label>
                </div>
              </div>

              <div class="flex justify-end">
                <button
                  type="submit"
                  :disabled="isSaving"
                  class="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium transition-colors disabled:opacity-50"
                >
                  <span v-if="isSaving">Đang lưu...</span>
                  <span v-else>Lưu cài đặt</span>
                </button>
              </div>
            </form>
          </div>

          <!-- Security Tab -->
          <div v-else-if="activeTab === 'security'" class="space-y-6">
            <!-- Change Password -->
            <div class="bg-white rounded-2xl shadow-sm p-6">
              <h2 class="text-xl font-bold text-gray-900 mb-6">Đổi mật khẩu</h2>

              <form class="space-y-6" @submit.prevent="changePassword">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Mật khẩu hiện tại</label>
                  <input
                    v-model="securityForm.currentPassword"
                    type="password"
                    class="w-full h-12 px-4 rounded-xl border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Nhập mật khẩu hiện tại"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Mật khẩu mới</label>
                  <input
                    v-model="securityForm.newPassword"
                    type="password"
                    class="w-full h-12 px-4 rounded-xl border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Nhập mật khẩu mới"
                  />
                  <!-- Password strength -->
                  <div v-if="securityForm.newPassword" class="mt-2">
                    <div class="flex gap-1 mb-1">
                      <div
                        v-for="i in 5"
                        :key="i"
                        class="h-1 flex-1 rounded-full transition-colors"
                        :class="i <= passwordStrength ? passwordStrengthColor : 'bg-gray-200'"
                      />
                    </div>
                    <p class="text-xs" :class="{
                      'text-red-500': passwordStrength <= 1,
                      'text-orange-500': passwordStrength === 2,
                      'text-yellow-500': passwordStrength === 3,
                      'text-green-500': passwordStrength === 4,
                      'text-emerald-500': passwordStrength === 5,
                    }">
                      Độ mạnh: {{ passwordStrengthLabel }}
                    </p>
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Xác nhận mật khẩu mới</label>
                  <input
                    v-model="securityForm.confirmPassword"
                    type="password"
                    class="w-full h-12 px-4 rounded-xl border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Nhập lại mật khẩu mới"
                  />
                  <p 
                    v-if="securityForm.confirmPassword && securityForm.newPassword !== securityForm.confirmPassword"
                    class="text-red-500 text-xs mt-1"
                  >
                    Mật khẩu xác nhận không khớp
                  </p>
                </div>

                <div class="flex justify-end">
                  <button
                    type="submit"
                    :disabled="isSaving || !securityForm.currentPassword || !securityForm.newPassword || !securityForm.confirmPassword"
                    class="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium transition-colors disabled:opacity-50"
                  >
                    <span v-if="isSaving">Đang xử lý...</span>
                    <span v-else>Đổi mật khẩu</span>
                  </button>
                </div>
              </form>
            </div>

            <!-- Two-Factor Auth -->
            <div class="bg-white rounded-2xl shadow-sm p-6">
              <div class="flex items-start justify-between">
                <div>
                  <h2 class="text-xl font-bold text-gray-900">Xác thực 2 yếu tố</h2>
                  <p class="text-gray-500 mt-1">Thêm một lớp bảo mật cho tài khoản của bạn</p>
                </div>
                <span class="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                  Chưa kích hoạt
                </span>
              </div>

              <button class="mt-6 px-6 py-3 rounded-xl border-2 border-primary text-primary font-medium hover:bg-primary hover:text-white transition-colors">
                Kích hoạt 2FA
              </button>
            </div>

            <!-- Sessions -->
            <div class="bg-white rounded-2xl shadow-sm p-6">
              <h2 class="text-xl font-bold text-gray-900 mb-6">Phiên đăng nhập</h2>

              <div class="space-y-4">
                <div class="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
                  <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <svg class="w-5 h-5 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                        <line x1="8" y1="21" x2="16" y2="21"/>
                        <line x1="12" y1="17" x2="12" y2="21"/>
                      </svg>
                    </div>
                    <div>
                      <p class="font-medium text-gray-900">Windows - Chrome</p>
                      <p class="text-sm text-gray-500">Hà Nội, Việt Nam • Phiên hiện tại</p>
                    </div>
                  </div>
                  <span class="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                    Đang hoạt động
                  </span>
                </div>

                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <svg class="w-5 h-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                        <line x1="12" y1="18" x2="12.01" y2="18"/>
                      </svg>
                    </div>
                    <div>
                      <p class="font-medium text-gray-900">iPhone - Safari</p>
                      <p class="text-sm text-gray-500">Hồ Chí Minh, Việt Nam • 2 ngày trước</p>
                    </div>
                  </div>
                  <button class="text-red-600 hover:text-red-700 font-medium text-sm">
                    Đăng xuất
                  </button>
                </div>
              </div>

              <button class="mt-6 text-red-600 hover:text-red-700 font-medium">
                Đăng xuất tất cả thiết bị khác
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
