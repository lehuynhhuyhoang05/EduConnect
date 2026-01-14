<script setup lang="ts">
import type { Poll } from '~/stores/polls'

const props = defineProps<{
  poll: Poll
  showResults?: boolean
}>()

const emit = defineEmits<{
  vote: [selectedOptions: number[], textAnswer?: string]
  start: []
  close: []
}>()

const authStore = useAuthStore()
const pollsStore = usePollsStore()

const selectedOptions = ref<number[]>([])
const textAnswer = ref('')
const timeLeft = ref(0)
let timerInterval: NodeJS.Timeout | null = null

const isCreator = computed(() => props.poll.createdById === authStore.user?.id)
const canVote = computed(() => 
  props.poll.status === 'active' && 
  !pollsStore.hasVoted && 
  !isCreator.value
)

const typeLabel = computed(() => {
  const labels: Record<string, string> = {
    single_choice: 'Chọn một',
    multiple_choice: 'Chọn nhiều',
    true_false: 'Đúng/Sai',
    short_answer: 'Trả lời ngắn',
  }
  return labels[props.poll.type] || props.poll.type
})

const statusColor = computed(() => {
  const colors: Record<string, string> = {
    draft: 'bg-gray-500',
    active: 'bg-green-500',
    closed: 'bg-red-500',
  }
  return colors[props.poll.status] || 'bg-gray-500'
})

const handleSelect = (index: number) => {
  if (!canVote.value) return
  
  if (props.poll.type === 'single_choice' || props.poll.type === 'true_false') {
    selectedOptions.value = [index]
  } else {
    const idx = selectedOptions.value.indexOf(index)
    if (idx > -1) {
      selectedOptions.value.splice(idx, 1)
    } else {
      selectedOptions.value.push(index)
    }
  }
}

const submitVote = () => {
  if (props.poll.type === 'short_answer') {
    emit('vote', [], textAnswer.value)
  } else {
    emit('vote', selectedOptions.value)
  }
}

// Timer for timed polls
watch(() => props.poll.status, (status) => {
  if (status === 'active' && props.poll.timeLimit > 0) {
    startTimer()
  } else if (timerInterval) {
    clearInterval(timerInterval)
  }
}, { immediate: true })

const startTimer = () => {
  if (!props.poll.startedAt) return
  
  const startTime = new Date(props.poll.startedAt).getTime()
  const endTime = startTime + props.poll.timeLimit * 1000
  
  const updateTimer = () => {
    const now = Date.now()
    timeLeft.value = Math.max(0, Math.floor((endTime - now) / 1000))
    
    if (timeLeft.value <= 0 && timerInterval) {
      clearInterval(timerInterval)
    }
  }
  
  updateTimer()
  timerInterval = setInterval(updateTimer, 1000)
}

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
  }
})

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="rounded-lg border bg-card p-4 shadow-sm">
    <!-- Header -->
    <div class="flex items-start justify-between mb-4">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span :class="['px-2 py-0.5 text-xs text-white rounded', statusColor]">
            {{ poll.status === 'draft' ? 'Nháp' : poll.status === 'active' ? 'Đang mở' : 'Đã đóng' }}
          </span>
          <span class="text-xs text-muted-foreground">{{ typeLabel }}</span>
          <span v-if="poll.isQuiz" class="px-2 py-0.5 text-xs bg-purple-500 text-white rounded">
            Quiz
          </span>
        </div>
        <h3 class="text-lg font-semibold">{{ poll.question }}</h3>
      </div>
      
      <!-- Timer -->
      <div v-if="poll.status === 'active' && poll.timeLimit > 0" 
           class="flex items-center gap-1 text-orange-500 font-mono">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {{ formatTime(timeLeft) }}
      </div>
    </div>

    <!-- Options -->
    <div v-if="poll.type !== 'short_answer'" class="space-y-2 mb-4">
      <button
        v-for="(option, index) in poll.options"
        :key="index"
        @click="handleSelect(index)"
        :disabled="!canVote"
        :class="[
          'w-full p-3 text-left rounded-lg border transition-all',
          selectedOptions.includes(index)
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border hover:border-primary/50',
          !canVote && 'opacity-60 cursor-not-allowed'
        ]"
      >
        <div class="flex items-center gap-3">
          <div :class="[
            'w-5 h-5 rounded-full border-2 flex items-center justify-center',
            selectedOptions.includes(index) ? 'border-primary bg-primary' : 'border-muted-foreground'
          ]">
            <svg v-if="selectedOptions.includes(index)" class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
          <span>{{ option }}</span>
        </div>
      </button>
    </div>

    <!-- Short Answer -->
    <div v-else class="mb-4">
      <textarea
        v-model="textAnswer"
        :disabled="!canVote"
        placeholder="Nhập câu trả lời của bạn..."
        class="w-full p-3 rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        rows="3"
      />
    </div>

    <!-- Actions -->
    <div class="flex items-center justify-between pt-3 border-t">
      <div class="text-sm text-muted-foreground">
        <span v-if="poll.anonymous">🔒 Bình chọn ẩn danh</span>
      </div>
      
      <div class="flex gap-2">
        <!-- Creator actions -->
        <template v-if="isCreator">
          <button
            v-if="poll.status === 'draft'"
            @click="emit('start')"
            class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
          >
            Bắt đầu
          </button>
          <button
            v-if="poll.status === 'active'"
            @click="emit('close')"
            class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            Đóng
          </button>
        </template>
        
        <!-- Voter actions -->
        <button
          v-if="canVote"
          @click="submitVote"
          :disabled="poll.type === 'short_answer' ? !textAnswer.trim() : selectedOptions.length === 0"
          class="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
        >
          Gửi câu trả lời
        </button>
        
        <span v-if="pollsStore.hasVoted" class="text-green-500 flex items-center gap-1">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          Đã gửi
        </span>
      </div>
    </div>
  </div>
</template>
