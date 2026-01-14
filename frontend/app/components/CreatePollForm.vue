<script setup lang="ts">
const emit = defineEmits<{
  submit: [data: {
    question: string
    type: 'single_choice' | 'multiple_choice' | 'true_false' | 'short_answer'
    options: string[]
    isQuiz: boolean
    correctAnswers?: number[]
    timeLimit?: number
    showResults: boolean
    anonymous: boolean
  }]
  cancel: []
}>()

const form = reactive({
  question: '',
  type: 'single_choice' as 'single_choice' | 'multiple_choice' | 'true_false' | 'short_answer',
  options: ['', ''],
  isQuiz: false,
  correctAnswers: [] as number[],
  timeLimit: 0,
  showResults: true,
  anonymous: false,
})

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
  if (form.type === 'single_choice') {
    form.correctAnswers = [index]
  } else {
    const idx = form.correctAnswers.indexOf(index)
    if (idx > -1) {
      form.correctAnswers.splice(idx, 1)
    } else {
      form.correctAnswers.push(index)
    }
  }
}

const handleSubmit = () => {
  if (!form.question.trim()) return
  
  // Filter valid options
  const validOptions = form.type === 'true_false' 
    ? ['Đúng', 'Sai'] 
    : form.type === 'short_answer'
      ? []
      : form.options.filter(o => o.trim())
  
  // Validate options for choice questions
  if (form.type !== 'short_answer' && validOptions.length < 2) {
    alert('Cần ít nhất 2 lựa chọn!')
    return
  }
  
  // Determine if quiz mode is valid (must have correct answers for non-short_answer)
  const isQuizValid = form.isQuiz && form.type !== 'short_answer' && form.correctAnswers.length > 0
  
  emit('submit', {
    question: form.question,
    type: form.type,
    // Luôn gửi options array
    options: form.type !== 'short_answer' ? validOptions : [],
    isQuiz: isQuizValid,
    correctAnswers: isQuizValid ? form.correctAnswers : undefined,
    timeLimit: form.timeLimit > 0 ? form.timeLimit : undefined,
    showResults: form.showResults,
    anonymous: form.anonymous,
  })
}

// Set default options for True/False
watch(() => form.type, (newType) => {
  if (newType === 'true_false') {
    form.options = ['Đúng', 'Sai']
  } else if (newType === 'short_answer') {
    form.options = []
  } else if (form.options.length < 2) {
    form.options = ['', '']
  }
})
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <!-- Question -->
    <div>
      <label class="block text-sm font-medium mb-2">Câu hỏi *</label>
      <textarea
        v-model="form.question"
        rows="2"
        class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
        placeholder="Nhập câu hỏi của bạn..."
        required
      />
    </div>

    <!-- Type -->
    <div>
      <label class="block text-sm font-medium mb-2">Loại câu hỏi</label>
      <select 
        v-model="form.type"
        class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary"
      >
        <option value="single_choice">Chọn một đáp án</option>
        <option value="multiple_choice">Chọn nhiều đáp án</option>
        <option value="true_false">Đúng/Sai</option>
        <option value="short_answer">Trả lời ngắn</option>
      </select>
    </div>

    <!-- Options (not for short_answer) -->
    <div v-if="form.type !== 'short_answer'" class="space-y-2">
      <label class="block text-sm font-medium mb-2">Các lựa chọn</label>
      
      <div v-for="(option, idx) in form.options" :key="idx" class="flex items-center gap-2">
        <input
          v-model="form.options[idx]"
          type="text"
          class="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary"
          :placeholder="`Lựa chọn ${idx + 1}`"
          :disabled="form.type === 'true_false'"
        />
        
        <!-- Mark correct (for quiz) -->
        <button
          v-if="form.isQuiz"
          type="button"
          @click="toggleCorrectAnswer(idx)"
          class="p-2 rounded-lg transition"
          :class="form.correctAnswers.includes(idx) ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'"
          :title="form.correctAnswers.includes(idx) ? 'Đáp án đúng' : 'Đánh dấu đúng'"
        >
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
        
        <!-- Remove option -->
        <button
          v-if="form.options.length > 2 && form.type !== 'true_false'"
          type="button"
          @click="removeOption(idx)"
          class="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition"
        >
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      
      <button
        v-if="form.type !== 'true_false'"
        type="button"
        @click="addOption"
        class="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary hover:text-primary transition"
      >
        + Thêm lựa chọn
      </button>
    </div>

    <!-- Quiz toggle -->
    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
      <div>
        <p class="font-medium">Đây là Quiz</p>
        <p class="text-sm text-gray-500">Có đáp án đúng/sai</p>
      </div>
      <label class="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" v-model="form.isQuiz" class="sr-only peer">
        <div class="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
      </label>
    </div>

    <!-- Settings -->
    <div class="grid grid-cols-2 gap-4">
      <label class="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer">
        <input type="checkbox" v-model="form.showResults" class="rounded text-primary focus:ring-primary">
        <span class="text-sm">Hiển thị kết quả</span>
      </label>
      <label class="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer">
        <input type="checkbox" v-model="form.anonymous" class="rounded text-primary focus:ring-primary">
        <span class="text-sm">Ẩn danh</span>
      </label>
    </div>

    <!-- Time limit -->
    <div>
      <label class="block text-sm font-medium mb-2">Giới hạn thời gian (giây, 0 = không giới hạn)</label>
      <input
        v-model.number="form.timeLimit"
        type="number"
        min="0"
        step="30"
        class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary"
      />
    </div>

    <!-- Actions -->
    <div class="flex gap-3 pt-2">
      <button
        type="button"
        @click="emit('cancel')"
        class="flex-1 py-3 rounded-xl border border-gray-300 font-medium hover:bg-gray-50 transition"
      >
        Hủy
      </button>
      <button
        type="submit"
        class="flex-1 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition"
      >
        Tạo Poll
      </button>
    </div>
  </form>
</template>
