<script setup lang="ts">
import type { Poll } from '~/stores/polls'

const emit = defineEmits<{
  submit: [poll: Partial<Poll>]
  cancel: []
}>()

const props = defineProps<{
  classId?: number
  sessionId?: number
}>()

const form = reactive({
  question: '',
  type: 'single_choice' as Poll['type'],
  options: ['', ''],
  isQuiz: false,
  correctAnswers: [] as number[],
  timeLimit: 0,
  showResults: true,
  anonymous: false,
})

const pollTypes = [
  { value: 'single_choice', label: 'Chọn một' },
  { value: 'multiple_choice', label: 'Chọn nhiều' },
  { value: 'true_false', label: 'Đúng/Sai' },
  { value: 'short_answer', label: 'Trả lời ngắn' },
]

const addOption = () => {
  form.options.push('')
}

const removeOption = (index: number) => {
  if (form.options.length > 2) {
    form.options.splice(index, 1)
    form.correctAnswers = form.correctAnswers.filter(i => i !== index).map(i => i > index ? i - 1 : i)
  }
}

const toggleCorrectAnswer = (index: number) => {
  const idx = form.correctAnswers.indexOf(index)
  if (idx > -1) {
    form.correctAnswers.splice(idx, 1)
  } else {
    if (form.type === 'single_choice' || form.type === 'true_false') {
      form.correctAnswers = [index]
    } else {
      form.correctAnswers.push(index)
    }
  }
}

watch(() => form.type, (type) => {
  if (type === 'true_false') {
    form.options = ['Đúng', 'Sai']
  }
})

const handleSubmit = () => {
  const poll: Partial<Poll> = {
    question: form.question,
    type: form.type,
    options: form.type !== 'short_answer' ? form.options.filter(o => o.trim()) : undefined,
    isQuiz: form.isQuiz,
    correctAnswers: form.isQuiz ? form.correctAnswers : undefined,
    timeLimit: form.timeLimit,
    showResults: form.showResults,
    anonymous: form.anonymous,
    classId: props.classId,
    sessionId: props.sessionId,
  }
  
  emit('submit', poll)
}

const isValid = computed(() => {
  if (!form.question.trim()) return false
  if (form.type !== 'short_answer' && form.options.filter(o => o.trim()).length < 2) return false
  if (form.isQuiz && form.correctAnswers.length === 0) return false
  return true
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-lg font-semibold mb-4">Tạo Poll/Quiz mới</h3>
    </div>

    <!-- Question -->
    <div>
      <label class="block text-sm font-medium mb-2">Câu hỏi *</label>
      <textarea
        v-model="form.question"
        placeholder="Nhập câu hỏi của bạn..."
        class="w-full p-3 rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        rows="2"
      />
    </div>

    <!-- Type -->
    <div>
      <label class="block text-sm font-medium mb-2">Loại câu hỏi</label>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        <button
          v-for="type in pollTypes"
          :key="type.value"
          @click="form.type = type.value as Poll['type']"
          :class="[
            'p-3 rounded-lg border text-sm transition',
            form.type === type.value
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border hover:border-primary/50'
          ]"
        >
          {{ type.label }}
        </button>
      </div>
    </div>

    <!-- Options (not for short answer) -->
    <div v-if="form.type !== 'short_answer'">
      <label class="block text-sm font-medium mb-2">Các lựa chọn *</label>
      <div class="space-y-2">
        <div v-for="(option, index) in form.options" :key="index" class="flex items-center gap-2">
          <input
            v-model="form.options[index]"
            :placeholder="`Lựa chọn ${index + 1}`"
            :disabled="form.type === 'true_false'"
            class="flex-1 p-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
          
          <!-- Mark as correct (for quiz) -->
          <button
            v-if="form.isQuiz"
            @click="toggleCorrectAnswer(index)"
            :class="[
              'p-2 rounded-lg border transition',
              form.correctAnswers.includes(index)
                ? 'border-green-500 bg-green-500/10 text-green-500'
                : 'border-border hover:border-green-500/50'
            ]"
            title="Đánh dấu đáp án đúng"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </button>
          
          <button
            v-if="form.options.length > 2 && form.type !== 'true_false'"
            @click="removeOption(index)"
            class="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      <button
        v-if="form.type !== 'true_false'"
        @click="addOption"
        class="mt-2 text-sm text-primary hover:underline"
      >
        + Thêm lựa chọn
      </button>
    </div>

    <!-- Settings -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <label class="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" v-model="form.isQuiz" class="rounded" />
        <span class="text-sm">Quiz mode (có đáp án đúng)</span>
      </label>
      
      <label class="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" v-model="form.showResults" class="rounded" />
        <span class="text-sm">Hiển thị kết quả cho học sinh</span>
      </label>
      
      <label class="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" v-model="form.anonymous" class="rounded" />
        <span class="text-sm">Bình chọn ẩn danh</span>
      </label>
      
      <div class="flex items-center gap-2">
        <label class="text-sm">Thời gian (giây):</label>
        <input
          v-model.number="form.timeLimit"
          type="number"
          min="0"
          step="30"
          class="w-20 p-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-3 pt-4 border-t">
      <button
        @click="emit('cancel')"
        class="px-4 py-2 border border-border rounded-lg hover:bg-muted transition"
      >
        Hủy
      </button>
      <button
        @click="handleSubmit"
        :disabled="!isValid"
        class="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
      >
        Tạo Poll
      </button>
    </div>
  </div>
</template>
