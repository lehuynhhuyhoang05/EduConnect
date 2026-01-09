<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const route = useRoute()
const authStore = useAuthStore()
const assignmentId = computed(() => route.params.id as string)

const isTeacher = computed(() => authStore.isTeacher)
const isLoading = ref(true)
const isSubmitting = ref(false)
const showSubmitModal = ref(false)
const showGradeModal = ref(false)
const selectedSubmission = ref<any>(null)

// Assignment data
const assignment = ref({
  id: 1,
  title: 'Bài tập lập trình Python cơ bản',
  description: `
    <h3>Yêu cầu</h3>
    <p>Viết một chương trình Python thực hiện các công việc sau:</p>
    <ol>
      <li>Nhập vào một danh sách các số nguyên từ người dùng</li>
      <li>Tìm số lớn nhất, nhỏ nhất và tính trung bình cộng</li>
      <li>Sắp xếp danh sách theo thứ tự tăng dần</li>
      <li>In kết quả ra màn hình với định dạng đẹp</li>
    </ol>
    <h3>Hướng dẫn</h3>
    <p>Sử dụng các hàm built-in của Python như <code>max()</code>, <code>min()</code>, <code>sum()</code>, <code>sorted()</code></p>
    <h3>Tiêu chí chấm điểm</h3>
    <ul>
      <li>Chương trình chạy đúng: 6 điểm</li>
      <li>Code sạch, dễ đọc: 2 điểm</li>
      <li>Xử lý ngoại lệ: 2 điểm</li>
    </ul>
  `,
  class: {
    id: 1,
    name: 'Lập trình Python',
    code: 'CS101'
  },
  dueDate: '2024-12-25T23:59:59',
  createdAt: '2024-12-01T10:00:00',
  maxScore: 10,
  status: 'open',
  attachments: [
    { id: 1, name: 'huong_dan.pdf', size: '245 KB', url: '#' },
    { id: 2, name: 'mau_bai_tap.py', size: '1.2 KB', url: '#' }
  ],
  submissions: {
    total: 28,
    submitted: 18,
    graded: 12
  }
})

// Student submission
const submission = ref<{
  id: number | null
  status: string
  submittedAt: string | null
  score: number | null
  feedback: string | null
  files: Array<{ id: number; name: string; size: string }>
}>({
  id: null,
  status: 'not_submitted',
  submittedAt: null,
  score: null,
  feedback: null,
  files: []
})

// Teacher view - all submissions
const allSubmissions = ref([
  { 
    id: 1, 
    student: { id: 1, name: 'Nguyễn Văn A', avatar: null },
    submittedAt: '2024-12-20T14:30:00',
    status: 'graded',
    score: 9,
    feedback: 'Bài làm tốt, code sạch, xử lý ngoại lệ đầy đủ.',
    files: [{ id: 1, name: 'baitap.py', size: '2.4 KB' }]
  },
  { 
    id: 2, 
    student: { id: 2, name: 'Trần Thị B', avatar: null },
    submittedAt: '2024-12-21T09:15:00',
    status: 'submitted',
    score: null,
    feedback: null,
    files: [{ id: 2, name: 'solution.py', size: '1.8 KB' }]
  },
  { 
    id: 3, 
    student: { id: 3, name: 'Lê Văn C', avatar: null },
    submittedAt: '2024-12-21T22:45:00',
    status: 'late',
    score: 7,
    feedback: 'Nộp muộn, trừ 1 điểm. Code cần cải thiện phần xử lý lỗi.',
    files: [{ id: 3, name: 'assignment.py', size: '3.1 KB' }]
  },
  { 
    id: 4, 
    student: { id: 4, name: 'Phạm Thị D', avatar: null },
    submittedAt: null,
    status: 'not_submitted',
    score: null,
    feedback: null,
    files: []
  },
  { 
    id: 5, 
    student: { id: 5, name: 'Hoàng Văn E', avatar: null },
    submittedAt: '2024-12-19T16:20:00',
    status: 'graded',
    score: 10,
    feedback: 'Xuất sắc! Code rất sạch và có nhiều xử lý nâng cao.',
    files: [{ id: 5, name: 'main.py', size: '4.2 KB' }]
  },
])

// Submit form
const submitForm = ref({
  content: '',
  files: [] as File[]
})

// Grade form
const gradeForm = ref({
  score: 0,
  feedback: ''
})

// Filter for submissions
const submissionFilter = ref('all')

const filteredSubmissions = computed(() => {
  if (submissionFilter.value === 'all') return allSubmissions.value
  return allSubmissions.value.filter(s => s.status === submissionFilter.value)
})

const getDaysRemaining = () => {
  const due = new Date(assignment.value.dueDate)
  const now = new Date()
  const diff = due.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  
  if (days < 0) return { text: 'Đã quá hạn', class: 'text-red-600' }
  if (days === 0) return { text: 'Hôm nay', class: 'text-orange-600' }
  if (days === 1) return { text: '1 ngày', class: 'text-orange-500' }
  if (days <= 3) return { text: `${days} ngày`, class: 'text-yellow-600' }
  return { text: `${days} ngày`, class: 'text-green-600' }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDateShort = (date: string | null) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusBadge = (status: string) => {
  const badges: Record<string, { text: string; class: string }> = {
    'graded': { text: 'Đã chấm', class: 'bg-green-100 text-green-700' },
    'submitted': { text: 'Đã nộp', class: 'bg-blue-100 text-blue-700' },
    'late': { text: 'Nộp muộn', class: 'bg-orange-100 text-orange-700' },
    'not_submitted': { text: 'Chưa nộp', class: 'bg-gray-100 text-gray-600' }
  }
  return badges[status] || badges['not_submitted']
}

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    submitForm.value.files = Array.from(target.files)
  }
}

const removeFile = (index: number) => {
  submitForm.value.files.splice(index, 1)
}

const handleSubmit = async () => {
  isSubmitting.value = true
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1500))
  
  submission.value = {
    id: 1,
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    score: null,
    feedback: null,
    files: submitForm.value.files.map((f, i) => ({ id: i + 1, name: f.name, size: `${(f.size / 1024).toFixed(1)} KB` }))
  }
  
  showSubmitModal.value = false
  isSubmitting.value = false
}

const openGradeModal = (sub: any) => {
  selectedSubmission.value = sub
  gradeForm.value.score = sub.score || 0
  gradeForm.value.feedback = sub.feedback || ''
  showGradeModal.value = true
}

const handleGrade = async () => {
  isSubmitting.value = true
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Update submission
  const index = allSubmissions.value.findIndex(s => s.id === selectedSubmission.value.id)
  if (index !== -1) {
    allSubmissions.value[index].score = gradeForm.value.score
    allSubmissions.value[index].feedback = gradeForm.value.feedback
    allSubmissions.value[index].status = 'graded'
  }
  
  showGradeModal.value = false
  isSubmitting.value = false
}

onMounted(() => {
  setTimeout(() => {
    isLoading.value = false
  }, 500)
})
</script>

<template>
  <div class="min-h-screen bg-gray-50/50">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p class="text-gray-500">Đang tải bài tập...</p>
      </div>
    </div>

    <div v-else class="max-w-7xl mx-auto px-4 py-6">
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-2 text-sm mb-6">
        <NuxtLink to="/dashboard" class="text-gray-500 hover:text-primary transition-colors">
          Trang chủ
        </NuxtLink>
        <span class="text-gray-400">/</span>
        <NuxtLink to="/assignments" class="text-gray-500 hover:text-primary transition-colors">
          Bài tập
        </NuxtLink>
        <span class="text-gray-400">/</span>
        <span class="text-gray-900 font-medium">{{ assignment.title }}</span>
      </nav>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Content -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Assignment Header -->
          <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
            <!-- Gradient Header -->
            <div class="relative bg-gradient-to-r from-primary via-purple-600 to-blue-600 p-6 text-white">
              <div class="absolute inset-0 bg-black/10" />
              <div class="relative">
                <div class="flex items-start justify-between mb-4">
                  <span class="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm">
                    {{ assignment.class.code }} - {{ assignment.class.name }}
                  </span>
                  <span 
                    class="px-3 py-1 rounded-full text-sm font-medium"
                    :class="assignment.status === 'open' ? 'bg-green-400/20 text-green-100' : 'bg-red-400/20 text-red-100'"
                  >
                    {{ assignment.status === 'open' ? 'Đang mở' : 'Đã đóng' }}
                  </span>
                </div>
                <h1 class="text-2xl font-bold mb-2">{{ assignment.title }}</h1>
                <div class="flex items-center gap-4 text-white/80 text-sm">
                  <div class="flex items-center gap-1.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Hạn: {{ formatDate(assignment.dueDate) }}
                  </div>
                  <div class="flex items-center gap-1.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Điểm tối đa: {{ assignment.maxScore }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Assignment Content -->
            <div class="p-6">
              <div class="prose prose-sm max-w-none" v-html="assignment.description" />
            </div>

            <!-- Attachments -->
            <div v-if="assignment.attachments.length > 0" class="px-6 pb-6">
              <h3 class="text-sm font-semibold text-gray-700 mb-3">Tệp đính kèm</h3>
              <div class="flex flex-wrap gap-2">
                <a 
                  v-for="file in assignment.attachments"
                  :key="file.id"
                  :href="file.url"
                  class="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
                >
                  <svg class="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p class="text-sm font-medium text-gray-700">{{ file.name }}</p>
                    <p class="text-xs text-gray-500">{{ file.size }}</p>
                  </div>
                  <svg class="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <!-- Teacher: Submissions List -->
          <div v-if="isTeacher" class="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div class="p-6 border-b border-gray-100">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-lg font-semibold text-gray-900">Danh sách bài nộp</h2>
                  <p class="text-sm text-gray-500 mt-1">
                    {{ assignment.submissions.submitted }}/{{ assignment.submissions.total }} đã nộp • 
                    {{ assignment.submissions.graded }} đã chấm
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <select 
                    v-model="submissionFilter"
                    class="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="all">Tất cả</option>
                    <option value="submitted">Chờ chấm</option>
                    <option value="graded">Đã chấm</option>
                    <option value="late">Nộp muộn</option>
                    <option value="not_submitted">Chưa nộp</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="divide-y divide-gray-100">
              <div 
                v-for="sub in filteredSubmissions" 
                :key="sub.id"
                class="p-4 hover:bg-gray-50/50 transition-colors"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-semibold">
                      {{ sub.student.name.charAt(0) }}
                    </div>
                    <div>
                      <p class="font-medium text-gray-900">{{ sub.student.name }}</p>
                      <div class="flex items-center gap-2 text-sm">
                        <span 
                          class="px-2 py-0.5 rounded-full text-xs font-medium"
                          :class="getStatusBadge(sub.status).class"
                        >
                          {{ getStatusBadge(sub.status).text }}
                        </span>
                        <span class="text-gray-500">{{ formatDateShort(sub.submittedAt) }}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="flex items-center gap-4">
                    <div v-if="sub.score !== null" class="text-right">
                      <p class="text-2xl font-bold text-primary">{{ sub.score }}</p>
                      <p class="text-xs text-gray-500">/ {{ assignment.maxScore }}</p>
                    </div>
                    <button 
                      v-if="sub.status !== 'not_submitted'"
                      class="px-4 py-2 text-sm font-medium rounded-xl transition-colors"
                      :class="sub.status === 'graded' 
                        ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                        : 'bg-primary text-white hover:bg-primary/90'"
                      @click="openGradeModal(sub)"
                    >
                      {{ sub.status === 'graded' ? 'Xem lại' : 'Chấm điểm' }}
                    </button>
                  </div>
                </div>
                
                <!-- Files preview -->
                <div v-if="sub.files.length > 0" class="mt-3 flex flex-wrap gap-2 pl-13">
                  <a 
                    v-for="file in sub.files" 
                    :key="file.id"
                    href="#"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    {{ file.name }}
                  </a>
                </div>
              </div>

              <div v-if="filteredSubmissions.length === 0" class="p-12 text-center">
                <div class="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p class="text-gray-500">Không có bài nộp nào</p>
              </div>
            </div>
          </div>

          <!-- Student: My Submission -->
          <div v-if="!isTeacher" class="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div class="p-6 border-b border-gray-100">
              <h2 class="text-lg font-semibold text-gray-900">Bài nộp của tôi</h2>
            </div>

            <!-- Not submitted -->
            <div v-if="submission.status === 'not_submitted'" class="p-12 text-center">
              <div class="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary/10 to-purple-100 rounded-full flex items-center justify-center">
                <svg class="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">Chưa nộp bài</h3>
              <p class="text-gray-500 mb-6">Hãy hoàn thành bài tập và nộp trước hạn chót</p>
              <button 
                class="px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
                @click="showSubmitModal = true"
              >
                Nộp bài ngay
              </button>
            </div>

            <!-- Submitted -->
            <div v-else class="p-6">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p class="font-semibold text-gray-900">Đã nộp bài</p>
                    <p class="text-sm text-gray-500">{{ formatDateShort(submission.submittedAt) }}</p>
                  </div>
                </div>
                
                <div v-if="submission.score !== null" class="text-center">
                  <p class="text-3xl font-bold text-primary">{{ submission.score }}</p>
                  <p class="text-sm text-gray-500">/ {{ assignment.maxScore }}</p>
                </div>
                <span v-else class="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-xl text-sm font-medium">
                  Đang chờ chấm
                </span>
              </div>

              <!-- Files -->
              <div class="mb-4">
                <p class="text-sm font-medium text-gray-700 mb-2">Tệp đã nộp</p>
                <div class="flex flex-wrap gap-2">
                  <a 
                    v-for="file in submission.files" 
                    :key="file.id"
                    href="#"
                    class="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span class="text-sm font-medium text-gray-700">{{ file.name }}</span>
                    <span class="text-xs text-gray-500">{{ file.size }}</span>
                  </a>
                </div>
              </div>

              <!-- Feedback -->
              <div v-if="submission.feedback" class="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p class="text-sm font-medium text-blue-800 mb-1">Nhận xét từ giáo viên</p>
                <p class="text-sm text-blue-700">{{ submission.feedback }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Deadline Card -->
          <div class="bg-white rounded-2xl shadow-sm p-6">
            <h3 class="font-semibold text-gray-900 mb-4">Thời hạn</h3>
            
            <div class="relative">
              <div class="flex items-center gap-3 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center" :class="getDaysRemaining().class.replace('text-', 'bg-').replace('600', '100')">
                  <svg class="w-6 h-6" :class="getDaysRemaining().class" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p class="text-sm text-gray-500">Còn lại</p>
                  <p class="text-lg font-bold" :class="getDaysRemaining().class">{{ getDaysRemaining().text }}</p>
                </div>
              </div>
            </div>

            <div class="mt-4 pt-4 border-t border-gray-100">
              <div class="flex justify-between text-sm">
                <span class="text-gray-500">Ngày giao</span>
                <span class="text-gray-900">{{ formatDateShort(assignment.createdAt) }}</span>
              </div>
              <div class="flex justify-between text-sm mt-2">
                <span class="text-gray-500">Hạn nộp</span>
                <span class="text-gray-900">{{ formatDateShort(assignment.dueDate) }}</span>
              </div>
            </div>
          </div>

          <!-- Progress Card (Teacher) -->
          <div v-if="isTeacher" class="bg-white rounded-2xl shadow-sm p-6">
            <h3 class="font-semibold text-gray-900 mb-4">Tiến độ nộp bài</h3>
            
            <div class="space-y-4">
              <div>
                <div class="flex justify-between text-sm mb-2">
                  <span class="text-gray-600">Đã nộp</span>
                  <span class="font-medium text-gray-900">{{ assignment.submissions.submitted }}/{{ assignment.submissions.total }}</span>
                </div>
                <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-gradient-to-r from-primary to-purple-600 rounded-full transition-all"
                    :style="{ width: `${(assignment.submissions.submitted / assignment.submissions.total) * 100}%` }"
                  />
                </div>
              </div>

              <div>
                <div class="flex justify-between text-sm mb-2">
                  <span class="text-gray-600">Đã chấm</span>
                  <span class="font-medium text-gray-900">{{ assignment.submissions.graded }}/{{ assignment.submissions.submitted }}</span>
                </div>
                <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all"
                    :style="{ width: `${assignment.submissions.submitted > 0 ? (assignment.submissions.graded / assignment.submissions.submitted) * 100 : 0}%` }"
                  />
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
              <div class="p-3 bg-gray-50 rounded-xl text-center">
                <p class="text-2xl font-bold text-gray-900">{{ assignment.submissions.total - assignment.submissions.submitted }}</p>
                <p class="text-xs text-gray-500">Chưa nộp</p>
              </div>
              <div class="p-3 bg-gray-50 rounded-xl text-center">
                <p class="text-2xl font-bold text-gray-900">{{ assignment.submissions.submitted - assignment.submissions.graded }}</p>
                <p class="text-xs text-gray-500">Chờ chấm</p>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="bg-white rounded-2xl shadow-sm p-6">
            <h3 class="font-semibold text-gray-900 mb-4">Hành động</h3>
            <div class="space-y-2">
              <NuxtLink 
                :to="`/classes/${assignment.class.id}`"
                class="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-900">Đến lớp học</p>
                  <p class="text-xs text-gray-500">{{ assignment.class.name }}</p>
                </div>
              </NuxtLink>

              <button 
                v-if="!isTeacher && submission.status === 'not_submitted'"
                class="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white hover:shadow-lg hover:shadow-primary/25 transition-all"
                @click="showSubmitModal = true"
              >
                <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <span class="font-medium">Nộp bài</span>
              </button>

              <button 
                v-if="isTeacher"
                class="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-600/25 transition-all"
              >
                <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <span class="font-medium">Tải xuống tất cả</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Submit Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div 
          v-if="showSubmitModal" 
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          @click.self="showSubmitModal = false"
        >
          <Transition
            enter-active-class="transition-all duration-300"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition-all duration-200"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div v-if="showSubmitModal" class="w-full max-w-lg bg-white rounded-2xl shadow-xl">
              <div class="p-6 border-b border-gray-100">
                <div class="flex items-center justify-between">
                  <h2 class="text-xl font-bold text-gray-900">Nộp bài tập</h2>
                  <button 
                    class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
                    @click="showSubmitModal = false"
                  >
                    <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div class="p-6 space-y-4">
                <!-- Text content -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Ghi chú (tuỳ chọn)</label>
                  <textarea 
                    v-model="submitForm.content"
                    class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all"
                    rows="3"
                    placeholder="Thêm ghi chú cho bài nộp..."
                  />
                </div>

                <!-- File upload -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Tệp đính kèm</label>
                  <div 
                    class="relative border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
                    @click="($refs.fileInput as HTMLInputElement)?.click()"
                  >
                    <input 
                      ref="fileInput"
                      type="file" 
                      multiple 
                      class="hidden" 
                      @change="handleFileChange"
                    />
                    <svg class="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p class="text-sm text-gray-600">Kéo thả tệp vào đây hoặc <span class="text-primary font-medium">chọn tệp</span></p>
                    <p class="text-xs text-gray-400 mt-1">Hỗ trợ: PDF, DOC, PY, ZIP (tối đa 10MB)</p>
                  </div>

                  <!-- File list -->
                  <div v-if="submitForm.files.length > 0" class="mt-3 space-y-2">
                    <div 
                      v-for="(file, index) in submitForm.files" 
                      :key="index"
                      class="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                    >
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p class="text-sm font-medium text-gray-700">{{ file.name }}</p>
                          <p class="text-xs text-gray-500">{{ (file.size / 1024).toFixed(1) }} KB</p>
                        </div>
                      </div>
                      <button 
                        class="w-8 h-8 rounded-lg hover:bg-red-100 flex items-center justify-center transition-colors"
                        @click="removeFile(index)"
                      >
                        <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="p-6 border-t border-gray-100 flex gap-3">
                <button 
                  class="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                  @click="showSubmitModal = false"
                >
                  Huỷ
                </button>
                <button 
                  class="flex-1 px-4 py-3 bg-gradient-to-r from-primary to-purple-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50"
                  :disabled="isSubmitting || submitForm.files.length === 0"
                  @click="handleSubmit"
                >
                  <span v-if="isSubmitting" class="flex items-center justify-center gap-2">
                    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang nộp...
                  </span>
                  <span v-else>Nộp bài</span>
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- Grade Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div 
          v-if="showGradeModal" 
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          @click.self="showGradeModal = false"
        >
          <Transition
            enter-active-class="transition-all duration-300"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition-all duration-200"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div v-if="showGradeModal && selectedSubmission" class="w-full max-w-lg bg-white rounded-2xl shadow-xl">
              <div class="p-6 border-b border-gray-100">
                <div class="flex items-center justify-between">
                  <div>
                    <h2 class="text-xl font-bold text-gray-900">Chấm điểm</h2>
                    <p class="text-sm text-gray-500 mt-1">{{ selectedSubmission.student.name }}</p>
                  </div>
                  <button 
                    class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
                    @click="showGradeModal = false"
                  >
                    <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div class="p-6 space-y-4">
                <!-- Files -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Bài nộp</label>
                  <div class="flex flex-wrap gap-2">
                    <a 
                      v-for="file in selectedSubmission.files" 
                      :key="file.id"
                      href="#"
                      class="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                      <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span class="text-sm font-medium text-gray-700">{{ file.name }}</span>
                    </a>
                  </div>
                </div>

                <!-- Score -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Điểm số</label>
                  <div class="flex items-center gap-4">
                    <input 
                      v-model.number="gradeForm.score"
                      type="range"
                      :min="0"
                      :max="assignment.maxScore"
                      step="0.5"
                      class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div class="w-20 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-center">
                      <span class="text-lg font-bold text-primary">{{ gradeForm.score }}</span>
                      <span class="text-gray-400">/{{ assignment.maxScore }}</span>
                    </div>
                  </div>
                </div>

                <!-- Feedback -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Nhận xét</label>
                  <textarea 
                    v-model="gradeForm.feedback"
                    class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all"
                    rows="4"
                    placeholder="Nhận xét về bài làm của học sinh..."
                  />
                </div>
              </div>

              <div class="p-6 border-t border-gray-100 flex gap-3">
                <button 
                  class="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                  @click="showGradeModal = false"
                >
                  Huỷ
                </button>
                <button 
                  class="flex-1 px-4 py-3 bg-gradient-to-r from-primary to-purple-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50"
                  :disabled="isSubmitting"
                  @click="handleGrade"
                >
                  <span v-if="isSubmitting" class="flex items-center justify-center gap-2">
                    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang lưu...
                  </span>
                  <span v-else>Lưu điểm</span>
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.prose :deep(h3) {
  @apply text-lg font-semibold text-gray-900 mt-4 mb-2;
}

.prose :deep(p) {
  @apply text-gray-600 mb-3;
}

.prose :deep(ol) {
  @apply list-decimal list-inside mb-3 space-y-1;
}

.prose :deep(ul) {
  @apply list-disc list-inside mb-3 space-y-1;
}

.prose :deep(li) {
  @apply text-gray-600;
}

.prose :deep(code) {
  @apply px-1.5 py-0.5 bg-gray-100 rounded text-primary text-sm font-mono;
}
</style>