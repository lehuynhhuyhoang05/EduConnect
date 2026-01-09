<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const assignmentsStore = useAssignmentsStore()
const { toast } = useToast()

const assignmentId = computed(() => Number(route.params.id))

const isTeacher = computed(() => authStore.isTeacher)
const isLoading = ref(true)
const isSubmitting = ref(false)
const isDownloading = ref(false)
const showSubmitModal = ref(false)
const showGradeModal = ref(false)
const showDeleteGradeConfirm = ref(false)
const selectedSubmission = ref<any>(null)
const gradeMode = ref<'create' | 'edit'>('create')

// Assignment data from API
const assignment = computed(() => assignmentsStore.currentAssignment)
const submissions = computed(() => assignmentsStore.submissions)
const mySubmission = computed(() => assignmentsStore.mySubmission)

// Computed counts for teacher progress
const gradedCount = computed(() => {
  if (!submissions.value) return 0
  return submissions.value.filter((s: any) => s.status === 'graded').length
})

const pendingCount = computed(() => {
  if (!submissions.value) return 0
  return submissions.value.filter((s: any) => s.status === 'submitted').length
})

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
  if (!submissions.value) return []
  if (submissionFilter.value === 'all') return submissions.value
  return submissions.value.filter((s: any) => s.status === submissionFilter.value)
})

const getDaysRemaining = () => {
  if (!assignment.value?.deadline) return { text: 'Không có hạn', class: 'text-gray-500' }
  
  const due = new Date(assignment.value.deadline)
  const now = new Date()
  const diff = due.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  
  if (days < 0) return { text: 'Đã quá hạn', class: 'text-red-600' }
  if (days === 0) return { text: 'Hôm nay', class: 'text-orange-600' }
  if (days === 1) return { text: '1 ngày', class: 'text-orange-500' }
  if (days <= 3) return { text: `${days} ngày`, class: 'text-yellow-600' }
  return { text: `${days} ngày`, class: 'text-green-600' }
}

const formatDate = (date: string | Date | undefined) => {
  if (!date) return 'Không xác định'
  return new Date(date).toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDateShort = (date: string | Date | null | undefined) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusBadge = (status: string): { text: string; class: string } => {
  const badges: Record<string, { text: string; class: string }> = {
    'graded': { text: 'Đã chấm', class: 'bg-green-100 text-green-700' },
    'submitted': { text: 'Đã nộp', class: 'bg-blue-100 text-blue-700' },
    'returned': { text: 'Đã trả', class: 'bg-purple-100 text-purple-700' },
    'late': { text: 'Nộp muộn', class: 'bg-orange-100 text-orange-700' },
    'not_submitted': { text: 'Chưa nộp', class: 'bg-gray-100 text-gray-600' }
  }
  return badges[status] ?? { text: 'Đã nộp', class: 'bg-blue-100 text-blue-700' }
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

// Helper to get full file URL
const getFileUrl = (path: string | undefined) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  const config = useRuntimeConfig()
  return `${config.public.apiUrl}${path}`
}

const handleSubmit = async () => {
  // Validate that user has either content or file
  if (!submitForm.value.content?.trim() && submitForm.value.files.length === 0) {
    toast.error('Vui lòng nhập nội dung hoặc đính kèm tệp')
    return
  }
  
  isSubmitting.value = true
  try {
    const submissionData: any = {}
    
    // Upload file first if exists
    if (submitForm.value.files.length > 0 && submitForm.value.files[0]) {
      const formData = new FormData()
      const file = submitForm.value.files[0]
      
      // Debug logging
      console.log('Uploading file:', {
        name: file.name,
        size: file.size,
        type: file.type,
        isFile: file instanceof File,
        isBlob: file instanceof Blob
      })
      
      // Ensure it's a valid File/Blob object
      if (file instanceof File || file instanceof Blob) {
        formData.append('file', file, file.name || 'upload')
        
        const api = useApi()
        const uploadResult = await api.upload<{ path: string }>('/files/upload', formData)
        submissionData.fileUrl = uploadResult.path
        submissionData.originalFileName = file.name // Save original filename
      } else {
        toast.error('File không hợp lệ')
        isSubmitting.value = false
        return
      }
    }
    
    if (submitForm.value.content?.trim()) {
      submissionData.content = submitForm.value.content
    }
    
    // Ensure at least one field is present
    if (!submissionData.content && !submissionData.fileUrl) {
      submissionData.content = 'Đã nộp bài'
    }
    
    await assignmentsStore.submitAssignment(assignmentId.value, submissionData)
    toast.success('Đã nộp bài thành công!')
    showSubmitModal.value = false
    submitForm.value = { content: '', files: [] }
    
    // Reload submission data and assignment to update counts
    await Promise.all([
      assignmentsStore.fetchMySubmission(assignmentId.value),
      assignmentsStore.fetchAssignment(assignmentId.value),
      assignmentsStore.fetchAssignments() // Reload list for sidebar/other views
    ])
  } catch (error: any) {
    toast.error(`Không thể nộp bài: ${error.message}`)
  } finally {
    isSubmitting.value = false
  }
}

const openGradeModal = (sub: any, mode: 'create' | 'edit' = 'create') => {
  selectedSubmission.value = sub
  gradeForm.value.score = sub.score ?? 0
  gradeForm.value.feedback = sub.feedback || ''
  gradeMode.value = mode
  showGradeModal.value = true
}

const handleGrade = async () => {
  if (!selectedSubmission.value) return
  
  // Validate score
  const maxScore = assignment.value?.maxScore || 10
  if (gradeForm.value.score < 0 || gradeForm.value.score > maxScore) {
    toast.error(`Điểm phải từ 0 đến ${maxScore}`)
    return
  }
  
  isSubmitting.value = true
  try {
    await assignmentsStore.gradeSubmission(selectedSubmission.value.id, {
      score: gradeForm.value.score,
      feedback: gradeForm.value.feedback
    })
    toast.success(gradeMode.value === 'edit' ? 'Đã cập nhật điểm!' : 'Đã chấm điểm thành công!')
    showGradeModal.value = false
    // Refresh all related data
    await Promise.all([
      assignmentsStore.fetchSubmissions(assignmentId.value),
      assignmentsStore.fetchAssignment(assignmentId.value),
      assignmentsStore.fetchAssignments() // Reload list
    ])
  } catch (error: any) {
    toast.error(`Không thể chấm điểm: ${error.message}`)
  } finally {
    isSubmitting.value = false
  }
}

const handleDeleteGrade = async () => {
  if (!selectedSubmission.value) return
  
  isSubmitting.value = true
  try {
    // Set score to null/0 and return submission
    await assignmentsStore.returnSubmission(selectedSubmission.value.id, 'Điểm đã bị xóa, vui lòng nộp lại')
    toast.success('Đã xóa điểm và trả bài!')
    showDeleteGradeConfirm.value = false
    showGradeModal.value = false
    // Refresh all related data
    await Promise.all([
      assignmentsStore.fetchSubmissions(assignmentId.value),
      assignmentsStore.fetchAssignment(assignmentId.value),
      assignmentsStore.fetchAssignments()
    ])
  } catch (error: any) {
    toast.error(`Không thể xóa điểm: ${error.message}`)
  } finally {
    isSubmitting.value = false
  }
}

// Download single submission
const downloadSubmission = async (sub: any) => {
  if (!sub.fileUrl) {
    toast.error('Bài nộp này không có tệp đính kèm')
    return
  }
  
  try {
    const fileUrl = getFileUrl(sub.fileUrl)
    const fileName = sub.originalFileName || sub.fileUrl.split('/').pop()
    const studentName = sub.student?.fullName?.replace(/\s+/g, '_') || 'student'
    const downloadName = `${studentName}_${fileName}`
    
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = downloadName
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch {
    toast.error('Không thể tải xuống tệp')
  }
}

// Download all submissions as zip (or export grades as CSV)
const downloadAllSubmissions = async () => {
  isDownloading.value = true
  try {
    // Export grades as CSV for now
    const csvData = await assignmentsStore.exportGrades(assignmentId.value)
    
    // Create and download CSV file
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `grades_${assignment.value?.title || 'assignment'}_${assignmentId.value}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
    
    toast.success('Đã tải xuống danh sách điểm!')
  } catch (error: any) {
    toast.error(`Không thể tải xuống: ${error.message}`)
  } finally {
    isDownloading.value = false
  }
}

onMounted(async () => {
  try {
    await assignmentsStore.fetchAssignment(assignmentId.value)
    
    if (isTeacher.value) {
      await assignmentsStore.fetchSubmissions(assignmentId.value)
    } else {
      await assignmentsStore.fetchMySubmission(assignmentId.value)
    }
  } catch (error: any) {
    console.error('Failed to load assignment:', error)
    toast.error('Không thể tải bài tập')
    router.push('/assignments')
  } finally {
    isLoading.value = false
  }
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
        <span class="text-gray-900 font-medium">{{ assignment?.title || 'Bài tập' }}</span>
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
                    {{ assignment?.class?.classCode || '' }} - {{ assignment?.class?.name || 'Lớp học' }}
                  </span>
                  <span 
                    class="px-3 py-1 rounded-full text-sm font-medium"
                    :class="assignment?.isActive ? 'bg-green-400/20 text-green-100' : 'bg-red-400/20 text-red-100'"
                  >
                    {{ assignment?.isActive ? 'Đang mở' : 'Đã đóng' }}
                  </span>
                </div>
                <h1 class="text-2xl font-bold mb-2">{{ assignment?.title }}</h1>
                <div class="flex items-center gap-4 text-white/80 text-sm">
                  <div class="flex items-center gap-1.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Hạn: {{ formatDate(assignment?.deadline) }}
                  </div>
                  <div class="flex items-center gap-1.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Điểm tối đa: {{ assignment?.maxScore || 10 }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Assignment Content -->
            <div class="p-6">
              <div class="prose prose-sm max-w-none" v-html="assignment?.description || 'Không có mô tả'" />
            </div>

            <!-- Attachments -->
            <div v-if="assignment?.attachmentUrl" class="px-6 pb-6">
              <h3 class="text-sm font-semibold text-gray-700 mb-3">Tệp đính kèm</h3>
              <div class="flex flex-wrap gap-2">
                <a 
                  :href="assignment.attachmentUrl"
                  target="_blank"
                  class="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
                >
                  <svg class="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p class="text-sm font-medium text-gray-700">Tệp đính kèm</p>
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
                    {{ submissions?.length || 0 }} bài nộp • {{ gradedCount }} đã chấm
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    @click="downloadAllSubmissions"
                    :disabled="isDownloading || !submissions?.length"
                    class="px-3 py-2 text-sm bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <svg v-if="isDownloading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Xuất CSV
                  </button>
                  <select 
                    v-model="submissionFilter"
                    class="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="all">Tất cả</option>
                    <option value="submitted">Chờ chấm</option>
                    <option value="graded">Đã chấm</option>
                    <option value="returned">Đã trả</option>
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
                      {{ sub.student?.fullName?.charAt(0) || 'S' }}
                    </div>
                    <div>
                      <p class="font-medium text-gray-900">{{ sub.student?.fullName || 'Học sinh' }}</p>
                      <div class="flex items-center gap-2 text-sm">
                        <span 
                          class="px-2 py-0.5 rounded-full text-xs font-medium"
                          :class="getStatusBadge(sub.status || 'submitted').class"
                        >
                          {{ getStatusBadge(sub.status || 'submitted').text }}
                        </span>
                        <span class="text-gray-500">{{ formatDateShort(sub.submittedAt) }}</span>
                        <span v-if="sub.isLate" class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          Muộn
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="flex items-center gap-3">
                    <!-- Score display -->
                    <div v-if="sub.score !== null && sub.score !== undefined" class="text-right mr-2">
                      <p class="text-2xl font-bold text-primary">{{ sub.score }}</p>
                      <p class="text-xs text-gray-500">/ {{ assignment?.maxScore || 10 }}</p>
                    </div>
                    
                    <!-- Download button -->
                    <button
                      v-if="sub.fileUrl"
                      @click="downloadSubmission(sub)"
                      class="px-3 py-2 text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5"
                      title="Tải xuống bài nộp"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>Tải về</span>
                    </button>
                    
                    <!-- Grade/Edit button -->
                    <button 
                      class="px-4 py-2 text-sm font-medium rounded-xl transition-colors"
                      :class="sub.status === 'graded' 
                        ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700' 
                        : 'bg-primary text-white hover:bg-primary/90'"
                      @click="openGradeModal(sub, sub.status === 'graded' ? 'edit' : 'create')"
                    >
                      {{ sub.status === 'graded' ? 'Sửa điểm' : 'Chấm điểm' }}
                    </button>
                  </div>
                </div>
                
                <!-- Submission content preview -->
                <div v-if="sub.content" class="mt-3 pl-13">
                  <p class="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 line-clamp-2">{{ sub.content }}</p>
                </div>
                
                <!-- Files preview -->
                <div v-if="sub.fileUrl" class="mt-3 flex flex-wrap gap-2 pl-13">
                  <a 
                    :href="getFileUrl(sub.fileUrl)"
                    :download="sub.originalFileName || sub.fileUrl.split('/').pop()"
                    target="_blank"
                    class="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm text-blue-700 transition-colors group"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span class="font-medium">{{ sub.originalFileName || sub.fileUrl.split('/').pop() }}</span>
                    <svg class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
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
            <div v-if="!mySubmission" class="p-12 text-center">
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
                    <p class="text-sm text-gray-500">{{ formatDateShort(mySubmission.submittedAt) }}</p>
                  </div>
                </div>
                
                <div v-if="mySubmission.score !== null && mySubmission.score !== undefined" class="text-center">
                  <p class="text-3xl font-bold text-primary">{{ mySubmission.score }}</p>
                  <p class="text-sm text-gray-500">/ {{ assignment?.maxScore || 10 }}</p>
                </div>
                <span v-else class="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-xl text-sm font-medium">
                  Đang chờ chấm
                </span>
              </div>

              <!-- Files -->
              <div v-if="mySubmission.fileUrl" class="mb-4">
                <p class="text-sm font-medium text-gray-700 mb-2">Tệp đã nộp</p>
                <div class="flex flex-wrap gap-2">
                  <a 
                    :href="getFileUrl(mySubmission.fileUrl)"
                    :download="mySubmission.originalFileName || mySubmission.fileUrl.split('/').pop()"
                    target="_blank"
                    class="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group"
                  >
                    <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span class="text-sm font-medium text-blue-700">{{ mySubmission.originalFileName || mySubmission.fileUrl.split('/').pop() }}</span>
                    <svg class="w-4 h-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                </div>
              </div>
              
              <!-- Content -->
              <div v-if="mySubmission.content" class="mb-4">
                <p class="text-sm font-medium text-gray-700 mb-2">Nội dung</p>
                <p class="text-sm text-gray-600">{{ mySubmission.content }}</p>
              </div>

              <!-- Feedback -->
              <div v-if="mySubmission.feedback" class="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p class="text-sm font-medium text-blue-800 mb-1">Nhận xét từ giáo viên</p>
                <p class="text-sm text-blue-700">{{ mySubmission.feedback }}</p>
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
                <span class="text-gray-900">{{ formatDateShort(assignment?.createdAt) }}</span>
              </div>
              <div class="flex justify-between text-sm mt-2">
                <span class="text-gray-500">Hạn nộp</span>
                <span class="text-gray-900">{{ formatDateShort(assignment?.deadline) }}</span>
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
                  <span class="font-medium text-gray-900">{{ submissions?.length || 0 }}</span>
                </div>
                <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-gradient-to-r from-primary to-purple-600 rounded-full transition-all"
                    :style="{ width: submissions?.length ? '100%' : '0%' }"
                  />
                </div>
              </div>

              <div>
                <div class="flex justify-between text-sm mb-2">
                  <span class="text-gray-600">Đã chấm</span>
                  <span class="font-medium text-gray-900">{{ gradedCount }}/{{ submissions?.length || 0 }}</span>
                </div>
                <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all"
                    :style="{ width: `${submissions?.length > 0 ? (gradedCount / submissions.length) * 100 : 0}%` }"
                  />
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
              <div class="p-3 bg-gray-50 rounded-xl text-center">
                <p class="text-2xl font-bold text-gray-900">{{ pendingCount }}</p>
                <p class="text-xs text-gray-500">Chờ chấm</p>
              </div>
              <div class="p-3 bg-gray-50 rounded-xl text-center">
                <p class="text-2xl font-bold text-gray-900">{{ gradedCount }}</p>
                <p class="text-xs text-gray-500">Đã chấm</p>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="bg-white rounded-2xl shadow-sm p-6">
            <h3 class="font-semibold text-gray-900 mb-4">Hành động</h3>
            <div class="space-y-2">
              <NuxtLink 
                :to="`/classes/${assignment?.class?.id || assignment?.classId}`"
                class="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-900">Đến lớp học</p>
                  <p class="text-xs text-gray-500">{{ assignment?.class?.name || 'Lớp học' }}</p>
                </div>
              </NuxtLink>

              <button 
                v-if="!isTeacher && !mySubmission"
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
                  :disabled="isSubmitting || (!submitForm.content?.trim() && submitForm.files.length === 0)"
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
                    <h2 class="text-xl font-bold text-gray-900">
                      {{ gradeMode === 'edit' ? 'Sửa điểm' : 'Chấm điểm' }}
                    </h2>
                    <p class="text-sm text-gray-500 mt-1">{{ selectedSubmission.student?.fullName || 'Học sinh' }}</p>
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

              <div class="p-6 space-y-5">
                <!-- Submission preview -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Bài nộp</label>
                  <div class="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div v-if="selectedSubmission.content" class="text-sm text-gray-600">
                      {{ selectedSubmission.content }}
                    </div>
                    <a 
                      v-if="selectedSubmission.fileUrl"
                      :href="getFileUrl(selectedSubmission.fileUrl)"
                      :download="selectedSubmission.originalFileName || selectedSubmission.fileUrl.split('/').pop()"
                      target="_blank"
                      class="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors text-blue-700 group"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span class="text-sm font-medium">{{ selectedSubmission.originalFileName || selectedSubmission.fileUrl.split('/').pop() }}</span>
                      <svg class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                    <p v-if="!selectedSubmission.content && !selectedSubmission.fileUrl" class="text-sm text-gray-400 italic">
                      Không có nội dung
                    </p>
                  </div>
                </div>

                <!-- Score input -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Điểm số</label>
                  <div class="flex items-center gap-3">
                    <input 
                      v-model.number="gradeForm.score"
                      type="number"
                      :min="0"
                      :max="assignment?.maxScore || 10"
                      step="0.5"
                      class="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-lg font-semibold text-center"
                      placeholder="Nhập điểm"
                    />
                    <span class="text-lg text-gray-500 font-medium">/ {{ assignment?.maxScore || 10 }}</span>
                  </div>
                  <div class="flex gap-2 mt-3">
                    <button 
                      v-for="preset in [0, 5, 7, 8, 9, assignment?.maxScore || 10]"
                      :key="preset"
                      @click="gradeForm.score = preset"
                      class="px-3 py-1.5 text-sm rounded-lg transition-colors"
                      :class="gradeForm.score === preset ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'"
                    >
                      {{ preset }}
                    </button>
                  </div>
                </div>

                <!-- Feedback -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Nhận xét (tuỳ chọn)</label>
                  <textarea 
                    v-model="gradeForm.feedback"
                    class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all"
                    rows="3"
                    placeholder="Nhận xét về bài làm của học sinh..."
                  />
                </div>
              </div>

              <div class="p-6 border-t border-gray-100 flex gap-3">
                <button 
                  v-if="gradeMode === 'edit'"
                  class="px-4 py-3 bg-red-100 text-red-700 font-medium rounded-xl hover:bg-red-200 transition-colors"
                  @click="showDeleteGradeConfirm = true"
                >
                  Xóa điểm
                </button>
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
                  <span v-else>{{ gradeMode === 'edit' ? 'Cập nhật' : 'Lưu điểm' }}</span>
                </button>
              </div>
              
              <!-- Delete confirmation -->
              <Transition name="fade">
                <div v-if="showDeleteGradeConfirm" class="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center p-6">
                  <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900 mb-2">Xóa điểm?</h3>
                  <p class="text-sm text-gray-500 text-center mb-6">Bài nộp sẽ được trả lại để học sinh nộp lại.</p>
                  <div class="flex gap-3 w-full max-w-xs">
                    <button 
                      class="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                      @click="showDeleteGradeConfirm = false"
                    >
                      Huỷ
                    </button>
                    <button 
                      class="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
                      :disabled="isSubmitting"
                      @click="handleDeleteGrade"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </Transition>
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