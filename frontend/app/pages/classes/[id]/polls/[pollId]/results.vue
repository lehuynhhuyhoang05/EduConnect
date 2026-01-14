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
const pollId = computed(() => Number(route.params.pollId))
const isLoading = ref(true)

const currentClass = computed(() => classesStore.currentClass)
const isTeacher = computed(() => currentClass.value?.teacherId === authStore.user?.id)

const poll = ref<any>(null)
const results = ref<any>(null)

onMounted(async () => {
  try {
    if (!classesStore.currentClass || classesStore.currentClass.id !== classId.value) {
      await classesStore.fetchClass(classId.value)
    }
    
    await pollsStore.fetchResults(pollId.value)
    results.value = pollsStore.currentResults
    
    poll.value = pollsStore.polls.find(p => p.id === pollId.value)
    if (!poll.value) {
      await pollsStore.fetchPolls({ classId: classId.value })
      poll.value = pollsStore.polls.find(p => p.id === pollId.value)
    }
  } catch (error) {
    toast.error('Khong the tai ket qua')
  } finally {
    isLoading.value = false
  }
})

const getPercentage = (count: number) => {
  if (!results.value || results.value.totalResponses === 0) return 0
  return Math.round((count / results.value.totalResponses) * 100)
}

const getBarColor = (index: number) => {
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500']
  return colors[index % colors.length]
}
</script>

<template>
  <div class="max-w-3xl mx-auto py-6 space-y-6">
    <div class="flex items-center gap-4">
      <NuxtLink :to="`/classes/${classId}/polls`">
        <button class="p-2 rounded-lg hover:bg-gray-100 transition">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
      </NuxtLink>
      <div>
        <h1 class="text-2xl font-bold">Ket qua Poll</h1>
        <p class="text-gray-500">{{ currentClass?.name }}</p>
      </div>
    </div>

    <div v-if="isLoading" class="space-y-4">
      <div class="h-24 bg-gray-100 rounded-2xl animate-pulse" />
      <div class="h-64 bg-gray-100 rounded-2xl animate-pulse" />
    </div>

    <template v-else-if="poll && results">
      <div class="bg-white rounded-2xl shadow-sm p-6">
        <div class="flex items-start justify-between mb-4">
          <div>
            <span class="px-3 py-1 rounded-full text-sm font-medium" :class="{
              'bg-green-100 text-green-700': poll.status === 'active',
              'bg-gray-100 text-gray-600': poll.status === 'closed',
              'bg-yellow-100 text-yellow-700': poll.status === 'draft',
            }">
              {{ poll.status === 'active' ? 'Dang mo' : poll.status === 'closed' ? 'Da dong' : 'Nhap' }}
            </span>
          </div>
          <div class="text-right text-sm text-gray-500">
            <div>{{ poll.isQuiz ? 'Quiz' : 'Poll' }}</div>
            <div>{{ results.totalResponses }} phan hoi</div>
          </div>
        </div>
        
        <h2 class="text-xl font-semibold mb-2">{{ poll.question }}</h2>
        <p class="text-gray-500 text-sm">
          Loai: {{ poll.type === 'single_choice' ? 'Chon mot' : poll.type === 'multiple_choice' ? 'Chon nhieu' : poll.type === 'true_false' ? 'Dung/Sai' : 'Tu luan' }}
        </p>
      </div>

      <div class="bg-white rounded-2xl shadow-sm p-6">
        <h3 class="text-lg font-semibold mb-6">Thong ke ket qua</h3>
        
        <template v-if="poll.type !== 'short_answer'">
          <div class="space-y-4">
            <div v-for="(option, index) in results.options" :key="index" class="space-y-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ option.text || poll.options?.[Number(index)] || `Lua chon ${Number(index) + 1}` }}</span>
                  <span v-if="poll.isQuiz && poll.correctAnswers?.includes(index)" class="text-green-600 text-sm">Dap an dung</span>
                </div>
                <div class="text-sm text-gray-500">
                  {{ option.count }} ({{ getPercentage(option.count) }}%)
                </div>
              </div>
              <div class="h-8 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  :class="['h-full rounded-full transition-all duration-500', getBarColor(Number(index))]"
                  :style="{ width: `${getPercentage(option.count)}%` }"
                />
              </div>
            </div>
          </div>
          
          <div class="mt-8 pt-6 border-t grid grid-cols-3 gap-4 text-center">
            <div>
              <div class="text-3xl font-bold text-primary">{{ results.totalResponses }}</div>
              <div class="text-sm text-gray-500">Tong phan hoi</div>
            </div>
            <div v-if="poll.isQuiz">
              <div class="text-3xl font-bold text-green-600">
                {{ results.options?.filter((o: any) => poll.correctAnswers?.includes(o.index)).reduce((sum: number, o: any) => sum + o.count, 0) || 0 }}
              </div>
              <div class="text-sm text-gray-500">Tra loi dung</div>
            </div>
            <div>
              <div class="text-3xl font-bold text-blue-600">
                {{ Math.max(...(results.options?.map((o: any) => o.count) || [0])) }}
              </div>
              <div class="text-sm text-gray-500">Lua chon pho bien nhat</div>
            </div>
          </div>
        </template>

        <template v-else>
          <div v-if="results.responses?.length > 0" class="space-y-3">
            <div 
              v-for="(response, index) in results.responses" 
              :key="index"
              class="p-4 rounded-xl bg-gray-50"
            >
              <p class="text-gray-700">{{ response.textAnswer }}</p>
              <p class="text-xs text-gray-400 mt-2">{{ response.user?.fullName || 'An danh' }}</p>
            </div>
          </div>
          <div v-else class="py-12 text-center text-gray-500">
            Chua co cau tra loi nao
          </div>
        </template>
      </div>

      <div v-if="isTeacher" class="flex justify-end">
        <button class="px-4 py-2 rounded-xl border border-gray-300 font-medium hover:bg-gray-50 transition flex items-center gap-2">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Xuat ket qua
        </button>
      </div>
    </template>

    <div v-else class="bg-white rounded-2xl shadow-sm p-12 text-center">
      <div class="text-6xl mb-4">📊</div>
      <h3 class="text-xl font-semibold mb-2">Khong tim thay ket qua</h3>
      <p class="text-gray-500">Poll khong ton tai hoac chua co du lieu</p>
    </div>
  </div>
</template>
