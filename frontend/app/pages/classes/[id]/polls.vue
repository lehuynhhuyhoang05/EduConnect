<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const authStore = useAuthStore()
const classesStore = useClassesStore()
const pollsStore = usePollsStore()
const { toast } = useToast()

const classId = computed(() => Number(route.params.id))
const isLoading = ref(true)
const showCreateDialog = ref(false)
const showImportDialog = ref(false)

const currentClass = computed(() => classesStore.currentClass)
const isTeacher = computed(() => currentClass.value?.teacherId === authStore.user?.id)

const activePolls = computed(() => pollsStore.activePolls)
const draftPolls = computed(() => pollsStore.draftPolls)
const closedPolls = computed(() => pollsStore.closedPolls)

onMounted(async () => {
  try {
    if (!classesStore.currentClass || classesStore.currentClass.id !== classId.value) {
      await classesStore.fetchClass(classId.value)
    }
    await pollsStore.fetchPolls({ classId: classId.value })
  } catch (error) {
    toast.error('Không thể tải danh sách polls')
  } finally {
    isLoading.value = false
  }
})

const handleCreatePoll = async (data: any) => {
  try {
    await pollsStore.createPoll({
      ...data,
      classId: classId.value,
    })
    showCreateDialog.value = false
    toast.success('Đã tạo poll!')
  } catch (error: any) {
    toast.error(`Không thể tạo poll: ${error.message}`)
  }
}

const handleImportPolls = async (polls: any[]) => {
  let success = 0
  let failed = 0
  
  for (const poll of polls) {
    try {
      await pollsStore.createPoll({
        ...poll,
        classId: classId.value,
      })
      success++
    } catch (error) {
      failed++
    }
  }
  
  showImportDialog.value = false
  
  if (success > 0) {
    toast.success(`Đã import ${success} câu hỏi${failed > 0 ? `, ${failed} lỗi` : ''}!`)
  } else {
    toast.error('Không thể import câu hỏi nào')
  }
}

const handleStartPoll = async (pollId: number) => {
  try {
    await pollsStore.startPoll(pollId)
    toast.success('Poll đã được bắt đầu!')
  } catch (error: any) {
    toast.error(`Không thể bắt đầu poll: ${error.message}`)
  }
}

const handleClosePoll = async (pollId: number) => {
  try {
    await pollsStore.closePoll(pollId)
    toast.success('Poll đã được đóng!')
  } catch (error: any) {
    toast.error(`Không thể đóng poll: ${error.message}`)
  }
}

const handleDeletePoll = async (pollId: number) => {
  if (!confirm('Bạn có chắc muốn xóa poll này?')) return
  
  try {
    await pollsStore.deletePoll(pollId)
    toast.success('Đã xóa poll!')
  } catch (error: any) {
    toast.error(`Không thể xóa poll: ${error.message}`)
  }
}

const handleVote = async (pollId: number, selectedOptions: number[], textAnswer?: string) => {
  try {
    await pollsStore.submitResponse(pollId, selectedOptions, textAnswer)
    toast.success('Đã gửi câu trả lời!')
    await pollsStore.fetchResults(pollId)
  } catch (error: any) {
    toast.error(`Không thể gửi câu trả lời: ${error.message}`)
  }
}
</script>

<template>
  <div class="max-w-5xl mx-auto py-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <NuxtLink :to="`/classes/${classId}`">
          <button class="p-2 rounded-lg hover:bg-gray-100 transition">
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
        </NuxtLink>
        <div>
          <h1 class="text-2xl font-bold">Polls & Quiz</h1>
          <p class="text-gray-500">{{ currentClass?.name }}</p>
        </div>
      </div>
      
      <div v-if="isTeacher" class="flex gap-2">
        <button 
          @click="showImportDialog = true"
          class="px-4 py-2 rounded-xl border border-gray-300 font-medium hover:bg-gray-50 transition flex items-center gap-2"
        >
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Import
        </button>
        <button 
          @click="showCreateDialog = true"
          class="px-4 py-2 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition flex items-center gap-2"
        >
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Tạo Poll
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="h-32 bg-gray-100 rounded-2xl animate-pulse" />
    </div>

    <template v-else>
      <!-- Active Polls -->
      <div v-if="activePolls.length > 0" class="space-y-4">
        <h2 class="text-lg font-semibold text-green-600 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Đang diễn ra
        </h2>
        <div v-for="poll in activePolls" :key="poll.id" class="bg-white rounded-2xl shadow-sm p-6">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-lg font-semibold">{{ poll.question }}</h3>
              <p class="text-sm text-gray-500">
                {{ poll.isQuiz ? 'Quiz' : 'Poll' }} • {{ poll.type === 'single_choice' ? 'Chọn 1' : poll.type === 'multiple_choice' ? 'Chọn nhiều' : poll.type }}
              </p>
            </div>
            <span class="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
              Đang mở
            </span>
          </div>
          
          <!-- Options for voting (student) -->
          <div v-if="!isTeacher && !pollsStore.hasVoted" class="space-y-2 mb-4">
            <button 
              v-for="(option, idx) in poll.options" 
              :key="idx"
              @click="handleVote(poll.id, [idx])"
              class="w-full p-3 text-left rounded-xl border-2 border-gray-200 hover:border-primary hover:bg-primary/5 transition"
            >
              {{ option }}
            </button>
          </div>
          
          <!-- Teacher actions -->
          <div v-if="isTeacher" class="flex gap-2">
            <button 
              @click="handleClosePoll(poll.id)"
              class="px-4 py-2 rounded-lg bg-red-100 text-red-700 font-medium hover:bg-red-200 transition"
            >
              Đóng poll
            </button>
            <NuxtLink :to="`/classes/${classId}/polls/${poll.id}/results`">
              <button class="px-4 py-2 rounded-lg bg-blue-100 text-blue-700 font-medium hover:bg-blue-200 transition">
                Xem kết quả
              </button>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Draft Polls (Teacher only) -->
      <div v-if="isTeacher && draftPolls.length > 0" class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-600">Bản nháp</h2>
        <div v-for="poll in draftPolls" :key="poll.id" class="bg-white rounded-2xl shadow-sm p-6">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-lg font-semibold">{{ poll.question }}</h3>
              <p class="text-sm text-gray-500">
                {{ poll.isQuiz ? 'Quiz' : 'Poll' }} • {{ poll.options.length }} lựa chọn
              </p>
            </div>
            <span class="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
              Nháp
            </span>
          </div>
          
          <div class="flex gap-2">
            <button 
              @click="handleStartPoll(poll.id)"
              class="px-4 py-2 rounded-lg bg-green-100 text-green-700 font-medium hover:bg-green-200 transition"
            >
              Bắt đầu
            </button>
            <button 
              @click="handleDeletePoll(poll.id)"
              class="px-4 py-2 rounded-lg bg-red-100 text-red-700 font-medium hover:bg-red-200 transition"
            >
              Xóa
            </button>
          </div>
        </div>
      </div>

      <!-- Closed Polls -->
      <div v-if="closedPolls.length > 0" class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-500">Đã kết thúc</h2>
        <div v-for="poll in closedPolls" :key="poll.id" class="bg-white rounded-2xl shadow-sm p-6 opacity-75">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-lg font-semibold">{{ poll.question }}</h3>
              <p class="text-sm text-gray-500">
                {{ poll.isQuiz ? 'Quiz' : 'Poll' }} • Kết thúc {{ new Date(poll.closedAt!).toLocaleDateString('vi-VN') }}
              </p>
            </div>
            <span class="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-500">
              Đã đóng
            </span>
          </div>
          
          <NuxtLink v-if="isTeacher" :to="`/classes/${classId}/polls/${poll.id}/results`">
            <button class="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition">
              Xem kết quả
            </button>
          </NuxtLink>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="activePolls.length === 0 && draftPolls.length === 0 && closedPolls.length === 0" 
           class="text-center py-12 bg-white rounded-2xl shadow-sm">
        <div class="text-6xl mb-4">📊</div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">Chưa có poll nào</h3>
        <p class="text-gray-500 mb-6">
          {{ isTeacher ? 'Tạo poll đầu tiên để khảo sát học sinh' : 'Giáo viên chưa tạo poll nào' }}
        </p>
        <button 
          v-if="isTeacher"
          @click="showCreateDialog = true"
          class="px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition"
        >
          Tạo Poll đầu tiên
        </button>
      </div>
    </template>

    <!-- Create Poll Dialog -->
    <Teleport to="body">
      <div v-if="showCreateDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" @click.stop>
          <h3 class="text-xl font-bold mb-4">Tạo Poll mới</h3>
          <CreatePollForm 
            @submit="handleCreatePoll" 
            @cancel="showCreateDialog = false" 
          />
        </div>
      </div>
    </Teleport>

    <!-- Import Poll Dialog -->
    <Teleport to="body">
      <div v-if="showImportDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" @click.stop>
          <h3 class="text-xl font-bold mb-4">📥 Import câu hỏi từ file</h3>
          <ImportPollsForm 
            @import="handleImportPolls" 
            @cancel="showImportDialog = false" 
          />
        </div>
      </div>
    </Teleport>
  </div>
</template>
