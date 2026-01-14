<script setup lang="ts">
const emit = defineEmits<{
  import: [polls: any[]]
  cancel: []
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const parsedPolls = ref<any[]>([])
const error = ref('')
const isProcessing = ref(false)

const handleFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files?.length && input.files[0]) {
    processFile(input.files[0])
  }
}

const handleDrop = (e: DragEvent) => {
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file) {
    processFile(file)
  }
}

const processFile = async (file: File) => {
  error.value = ''
  parsedPolls.value = []
  isProcessing.value = true
  
  const fileName = file.name.toLowerCase()
  
  try {
    if (fileName.endsWith('.csv')) {
      await parseCSV(file)
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      await parseExcel(file)
    } else if (fileName.endsWith('.json')) {
      await parseJSON(file)
    } else {
      error.value = 'Định dạng file không được hỗ trợ. Vui lòng sử dụng CSV, Excel hoặc JSON.'
    }
  } catch (err: any) {
    error.value = `Lỗi đọc file: ${err.message}`
  } finally {
    isProcessing.value = false
  }
}

const parseCSV = async (file: File) => {
  const text = await file.text()
  const lines = text.split('\n').filter(line => line.trim())
  
  if (lines.length < 2 || !lines[0]) {
    error.value = 'File CSV phải có ít nhất header và 1 dòng dữ liệu'
    return
  }
  
  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const questionIdx = headers.findIndex(h => h.includes('question') || h.includes('câu hỏi'))
  const typeIdx = headers.findIndex(h => h.includes('type') || h.includes('loại'))
  const optionsIdx = headers.findIndex(h => h.includes('option') || h.includes('lựa chọn'))
  const correctIdx = headers.findIndex(h => h.includes('correct') || h.includes('đáp án'))
  
  if (questionIdx === -1) {
    error.value = 'File CSV cần có cột "question" hoặc "câu hỏi"'
    return
  }
  
  // Parse rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const values = parseCSVLine(line)
    if (!values[questionIdx]?.trim()) continue
    
    const poll: any = {
      question: values[questionIdx].trim(),
      type: values[typeIdx]?.trim() || 'single_choice',
      options: [],
      isQuiz: false,
      correctAnswers: [],
    }
    
    // Parse options (comma or pipe separated)
    if (optionsIdx !== -1 && values[optionsIdx]) {
      const optStr = values[optionsIdx].trim()
      poll.options = optStr.includes('|') 
        ? optStr.split('|').map((o: string) => o.trim())
        : optStr.split(';').map((o: string) => o.trim())
    }
    
    // Parse correct answers
    if (correctIdx !== -1 && values[correctIdx]) {
      poll.isQuiz = true
      const correctStr = values[correctIdx].trim()
      poll.correctAnswers = correctStr.split(',').map((c: string) => parseInt(c.trim())).filter((n: number) => !isNaN(n))
    }
    
    // Validate type
    const validTypes = ['single_choice', 'multiple_choice', 'true_false', 'short_answer']
    if (!validTypes.includes(poll.type)) {
      poll.type = 'single_choice'
    }
    
    // Set default options for true_false
    if (poll.type === 'true_false' && poll.options.length === 0) {
      poll.options = ['Đúng', 'Sai']
    }
    
    parsedPolls.value.push(poll)
  }
  
  if (parsedPolls.value.length === 0) {
    error.value = 'Không tìm thấy câu hỏi nào trong file'
  }
}

const parseCSVLine = (line: string): string[] => {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  
  return result
}

const parseExcel = async (file: File) => {
  // Dynamic import xlsx library
  try {
    const XLSX = await import('xlsx')
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      error.value = 'File Excel không có sheet nào'
      return
    }
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) {
      error.value = 'Không thể đọc sheet Excel'
      return
    }
    const data = XLSX.utils.sheet_to_json(sheet)
    
    if (data.length === 0) {
      error.value = 'File Excel không có dữ liệu'
      return
    }
    
    for (const row of data as any[]) {
      const question = row['question'] || row['câu hỏi'] || row['Question'] || row['Câu hỏi']
      if (!question) continue
      
      const poll: any = {
        question: String(question).trim(),
        type: row['type'] || row['loại'] || 'single_choice',
        options: [],
        isQuiz: false,
        correctAnswers: [],
      }
      
      // Parse options
      const optionsStr = row['options'] || row['lựa chọn'] || row['Options'] || ''
      if (optionsStr) {
        poll.options = String(optionsStr).includes('|')
          ? String(optionsStr).split('|').map((o: string) => o.trim())
          : String(optionsStr).split(';').map((o: string) => o.trim())
      }
      
      // Parse correct answers  
      const correctStr = row['correct'] || row['đáp án'] || row['Correct'] || ''
      if (correctStr) {
        poll.isQuiz = true
        poll.correctAnswers = String(correctStr).split(',').map((c: string) => parseInt(c.trim())).filter((n: number) => !isNaN(n))
      }
      
      // Validate type
      const validTypes = ['single_choice', 'multiple_choice', 'true_false', 'short_answer']
      if (!validTypes.includes(poll.type)) {
        poll.type = 'single_choice'
      }
      
      if (poll.type === 'true_false' && poll.options.length === 0) {
        poll.options = ['Đúng', 'Sai']
      }
      
      parsedPolls.value.push(poll)
    }
    
    if (parsedPolls.value.length === 0) {
      error.value = 'Không tìm thấy câu hỏi nào trong file'
    }
  } catch (err: any) {
    error.value = 'Lỗi đọc file Excel. Vui lòng cài đặt thư viện xlsx: npm install xlsx'
  }
}

const parseJSON = async (file: File) => {
  const text = await file.text()
  const data = JSON.parse(text)
  
  const polls = Array.isArray(data) ? data : data.polls || data.questions || []
  
  for (const item of polls) {
    if (!item.question) continue
    
    parsedPolls.value.push({
      question: item.question,
      type: item.type || 'single_choice',
      options: item.options || [],
      isQuiz: item.isQuiz || false,
      correctAnswers: item.correctAnswers || [],
    })
  }
  
  if (parsedPolls.value.length === 0) {
    error.value = 'Không tìm thấy câu hỏi nào trong file JSON'
  }
}

const removePoll = (index: number) => {
  parsedPolls.value.splice(index, 1)
}

const handleImport = () => {
  if (parsedPolls.value.length === 0) return
  emit('import', parsedPolls.value)
}

const downloadTemplate = () => {
  const csvContent = `question,type,options,correct
"Thủ đô của Việt Nam là gì?",single_choice,"Hà Nội|Hồ Chí Minh|Đà Nẵng|Huế",0
"JavaScript là ngôn ngữ lập trình?",true_false,"Đúng|Sai",0
"Chọn các số nguyên tố",multiple_choice,"2|3|4|5|6","0,1,3"
"Mô tả ngắn về bản thân",short_answer,,`
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'poll_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Instructions -->
    <div class="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
      <p class="font-medium mb-2">📋 Hướng dẫn định dạng file:</p>
      <ul class="list-disc list-inside space-y-1">
        <li>Cột <strong>question</strong>: Nội dung câu hỏi (bắt buộc)</li>
        <li>Cột <strong>type</strong>: single_choice, multiple_choice, true_false, short_answer</li>
        <li>Cột <strong>options</strong>: Các lựa chọn, ngăn cách bằng | hoặc ;</li>
        <li>Cột <strong>correct</strong>: Chỉ số đáp án đúng (bắt đầu từ 0)</li>
      </ul>
    </div>

    <!-- File Drop Zone -->
    <div
      class="border-2 border-dashed rounded-xl p-8 text-center transition-colors"
      :class="isDragging ? 'border-primary bg-primary/5' : 'border-gray-300'"
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <input
        ref="fileInput"
        type="file"
        accept=".csv,.xlsx,.xls,.json"
        class="hidden"
        @change="handleFileSelect"
      />
      
      <div class="text-4xl mb-3">📁</div>
      <p class="text-gray-600 mb-2">Kéo thả file vào đây hoặc</p>
      <button
        type="button"
        @click="fileInput?.click()"
        class="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition"
      >
        Chọn file
      </button>
      <p class="text-sm text-gray-400 mt-2">Hỗ trợ: CSV, Excel (.xlsx, .xls), JSON</p>
    </div>

    <!-- Download Template -->
    <button
      type="button"
      @click="downloadTemplate"
      class="w-full py-2 text-sm text-primary hover:underline"
    >
      ⬇️ Tải file mẫu CSV
    </button>

    <!-- Processing -->
    <div v-if="isProcessing" class="text-center py-4">
      <div class="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
      <p class="text-gray-500">Đang xử lý file...</p>
    </div>

    <!-- Error -->
    <div v-if="error" class="bg-red-50 text-red-700 p-4 rounded-xl">
      {{ error }}
    </div>

    <!-- Parsed Polls Preview -->
    <div v-if="parsedPolls.length > 0" class="space-y-3">
      <h4 class="font-medium">Xem trước ({{ parsedPolls.length }} câu hỏi)</h4>
      
      <div class="max-h-64 overflow-y-auto space-y-2">
        <div 
          v-for="(poll, index) in parsedPolls" 
          :key="index"
          class="p-3 bg-gray-50 rounded-lg flex items-start justify-between gap-2"
        >
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">{{ poll.question }}</p>
            <p class="text-xs text-gray-500">
              {{ poll.type }} • {{ poll.options?.length || 0 }} lựa chọn
              <span v-if="poll.isQuiz" class="text-green-600">• Quiz</span>
            </p>
          </div>
          <button
            type="button"
            @click="removePoll(index)"
            class="p-1 text-red-500 hover:bg-red-100 rounded"
          >
            ✕
          </button>
        </div>
      </div>
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
        type="button"
        @click="handleImport"
        :disabled="parsedPolls.length === 0"
        class="flex-1 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Import {{ parsedPolls.length }} câu hỏi
      </button>
    </div>
  </div>
</template>
