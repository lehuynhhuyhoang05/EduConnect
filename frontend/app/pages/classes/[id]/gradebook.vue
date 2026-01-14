<script setup lang="ts">
import type { GradeItem, GradeEntry } from '~/stores/gradebook'

definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const authStore = useAuthStore()
const classesStore = useClassesStore()
const gradebookStore = useGradebookStore()
const { toast } = useToast()

const classId = computed(() => Number(route.params.id))
const isLoading = ref(true)
const showAddItemDialog = ref(false)
const editingItem = ref<GradeItem | null>(null)

const currentClass = computed(() => classesStore.currentClass)
const isTeacher = computed(() => currentClass.value?.teacherId === authStore.user?.id)

// Students data
const students = ref<{ id: number; fullName: string; email: string }[]>([])

onMounted(async () => {
  try {
    if (!classesStore.currentClass || classesStore.currentClass.id !== classId.value) {
      await classesStore.fetchClass(classId.value)
    }
    
    if (isTeacher.value) {
      await gradebookStore.fetchGradebook(classId.value)
      // Fetch class members
      await classesStore.fetchMembers(classId.value)
      const members = classesStore.members || []
      students.value = members
        .filter((m: any) => m.role === 'STUDENT')
        .map((m: any) => ({
          id: m.userId || m.user?.id || m.id,
          fullName: m.user?.fullName || m.fullName || 'Học sinh',
          email: m.user?.email || m.email || ''
        }))
    } else {
      await gradebookStore.fetchMyGrades(classId.value)
    }
  } catch (error) {
    toast.error('Không thể tải bảng điểm')
  } finally {
    isLoading.value = false
  }
})

const handleAddItem = async (item: Partial<GradeItem>) => {
  try {
    await gradebookStore.createGradeItem(classId.value, item)
    showAddItemDialog.value = false
    toast.success('Đã thêm cột điểm!')
  } catch (error: any) {
    toast.error(`Không thể thêm cột điểm: ${error.message}`)
  }
}

const handleUpdateItem = async (item: Partial<GradeItem>) => {
  if (!editingItem.value) return
  
  try {
    await gradebookStore.updateGradeItem(editingItem.value.id, item)
    editingItem.value = null
    toast.success('Đã cập nhật cột điểm!')
  } catch (error: any) {
    toast.error(`Không thể cập nhật cột điểm: ${error.message}`)
  }
}

const handleDeleteItem = async (itemId: number) => {
  if (!confirm('Bạn có chắc muốn xóa cột điểm này?')) return
  
  try {
    await gradebookStore.deleteGradeItem(itemId)
    toast.success('Đã xóa cột điểm!')
  } catch (error: any) {
    toast.error(`Không thể xóa cột điểm: ${error.message}`)
  }
}

const handleUpdateGrade = async (entryId: number, data: { points?: number; feedback?: string }) => {
  try {
    await gradebookStore.updateGradeEntry(entryId, data)
    toast.success('Đã cập nhật điểm!')
  } catch (error: any) {
    toast.error(`Không thể cập nhật điểm: ${error.message}`)
  }
}

const handleCreateGrade = async (data: { studentId: number; gradeItemId: number; points: number; feedback?: string }) => {
  try {
    await gradebookStore.createGradeEntry(data)
    toast.success('Đã nhập điểm!')
  } catch (error: any) {
    toast.error(`Không thể nhập điểm: ${error.message}`)
  }
}

const exportGrades = async () => {
  try {
    const blob = await gradebookStore.exportToCSV(classId.value)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gradebook-${classId.value}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Đã xuất file!')
  } catch (error: any) {
    toast.error(`Không thể xuất file: ${error.message}`)
  }
}

// Helper to get grade entry
const getGradeEntry = (studentId: number, itemId: number) => {
  return gradebookStore.gradeEntries.find(
    e => e.studentId === studentId && e.gradeItemId === itemId
  )
}

// Calculate student total
const getStudentTotal = (studentId: number) => {
  let earned = 0
  let possible = 0
  
  for (const item of gradebookStore.gradeItems) {
    const entry = getGradeEntry(studentId, item.id)
    if (entry) {
      earned += entry.points
    }
    possible += item.maxPoints
  }
  
  return {
    earned,
    possible,
    percentage: possible > 0 ? (earned / possible) * 100 : 0
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto py-6 space-y-6">
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
          <h1 class="text-2xl font-bold">Bảng điểm</h1>
          <p class="text-gray-500">{{ currentClass?.name }}</p>
        </div>
      </div>
      
      <div v-if="isTeacher" class="flex gap-2">
        <button 
          @click="exportGrades"
          class="px-4 py-2 rounded-xl border border-gray-300 font-medium hover:bg-gray-50 transition flex items-center gap-2"
        >
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Xuất CSV
        </button>
        <button 
          @click="showAddItemDialog = true"
          class="px-4 py-2 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition flex items-center gap-2"
        >
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Thêm cột điểm
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="bg-white rounded-2xl shadow-sm p-8">
      <div class="animate-pulse space-y-4">
        <div class="h-10 bg-gray-200 rounded w-full" />
        <div v-for="i in 5" :key="i" class="h-16 bg-gray-100 rounded" />
      </div>
    </div>

    <!-- Teacher View: Full gradebook -->
    <div v-else-if="isTeacher" class="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div v-if="gradebookStore.gradeItems.length === 0" class="p-12 text-center">
        <div class="text-6xl mb-4">📝</div>
        <h3 class="text-xl font-semibold mb-2">Chưa có cột điểm nào</h3>
        <p class="text-gray-500 mb-6">Tạo cột điểm đầu tiên để bắt đầu chấm điểm</p>
        <button 
          @click="showAddItemDialog = true"
          class="px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition"
        >
          Thêm cột điểm
        </button>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700 sticky left-0 bg-gray-50">
                Học sinh
              </th>
              <th 
                v-for="item in gradebookStore.gradeItems" 
                :key="item.id"
                class="px-4 py-3 text-center text-sm font-semibold text-gray-700 min-w-[120px]"
              >
                <div>{{ item.name }}</div>
                <div class="text-xs font-normal text-gray-500">{{ item.maxPoints }} điểm</div>
              </th>
              <th class="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                Tổng kết
              </th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-for="student in students" :key="student.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 sticky left-0 bg-white">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                    {{ student.fullName.charAt(0) }}
                  </div>
                  <div>
                    <div class="font-medium text-gray-900">{{ student.fullName }}</div>
                    <div class="text-xs text-gray-500">{{ student.email }}</div>
                  </div>
                </div>
              </td>
              <td 
                v-for="item in gradebookStore.gradeItems" 
                :key="item.id"
                class="px-4 py-3 text-center"
              >
                <div v-if="getGradeEntry(student.id, item.id)" class="font-medium">
                  {{ getGradeEntry(student.id, item.id)?.points }} / {{ item.maxPoints }}
                </div>
                <button 
                  v-else
                  @click="handleCreateGrade({ studentId: student.id, gradeItemId: item.id, points: 0 })"
                  class="text-gray-400 hover:text-primary"
                >
                  Nhập điểm
                </button>
              </td>
              <td class="px-4 py-3 text-center">
                <div class="font-bold text-lg" :class="getStudentTotal(student.id).percentage >= 50 ? 'text-green-600' : 'text-red-600'">
                  {{ getStudentTotal(student.id).percentage.toFixed(1) }}%
                </div>
                <div class="text-xs text-gray-500">
                  {{ getStudentTotal(student.id).earned }}/{{ getStudentTotal(student.id).possible }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Statistics -->
      <div v-if="gradebookStore.statistics" class="border-t p-4 bg-gray-50">
        <div class="grid grid-cols-4 gap-4 text-center">
          <div>
            <div class="text-2xl font-bold text-primary">{{ gradebookStore.statistics.classAverage?.toFixed(1) ?? 'N/A' }}%</div>
            <div class="text-sm text-gray-500">Trung bình lớp</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-green-600">{{ gradebookStore.statistics.highestScore?.toFixed(1) ?? 'N/A' }}%</div>
            <div class="text-sm text-gray-500">Điểm cao nhất</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-red-600">{{ gradebookStore.statistics.lowestScore?.toFixed(1) ?? 'N/A' }}%</div>
            <div class="text-sm text-gray-500">Điểm thấp nhất</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-blue-600">{{ gradebookStore.statistics.submissionRate?.toFixed(0) ?? 'N/A' }}%</div>
            <div class="text-sm text-gray-500">Tỷ lệ nộp bài</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Student View: My grades -->
    <div v-else class="space-y-4">
      <div v-if="!gradebookStore.studentGrades" class="bg-white rounded-2xl shadow-sm p-12 text-center">
        <div class="text-6xl mb-4">📊</div>
        <h3 class="text-xl font-semibold mb-2">Chưa có điểm</h3>
        <p class="text-gray-500">Điểm của bạn sẽ hiển thị ở đây khi giáo viên nhập</p>
      </div>

      <template v-else>
        <!-- Overall progress -->
        <div class="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-white">
          <h3 class="text-lg font-semibold mb-4">Tổng quan điểm số</h3>
          <div class="flex items-center gap-8">
            <div class="text-center">
              <div class="text-4xl font-bold">{{ gradebookStore.studentGrades.overallPercentage.toFixed(1) }}%</div>
              <div class="text-white/80">Điểm trung bình</div>
            </div>
            <div class="flex-1 space-y-2">
              <div class="flex justify-between text-sm">
                <span>Tiến độ</span>
                <span>{{ gradebookStore.studentGrades.totalEarned }}/{{ gradebookStore.studentGrades.totalPossible }} điểm</span>
              </div>
              <div class="h-3 bg-white/20 rounded-full overflow-hidden">
                <div 
                  class="h-full bg-white rounded-full transition-all"
                  :style="{ width: `${gradebookStore.studentGrades.overallPercentage}%` }"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Grade items -->
        <div class="bg-white rounded-2xl shadow-sm divide-y">
          <div 
            v-for="item in gradebookStore.studentGrades.items" 
            :key="item.gradeItemId"
            class="p-4 flex items-center justify-between"
          >
            <div>
              <h4 class="font-medium">{{ item.name }}</h4>
              <p class="text-sm text-gray-500">{{ item.category }}</p>
            </div>
            <div class="text-right">
              <div v-if="item.points !== undefined" class="text-lg font-bold" :class="(item.points / item.maxPoints) >= 0.5 ? 'text-green-600' : 'text-red-600'">
                {{ item.points }} / {{ item.maxPoints }}
              </div>
              <div v-else class="text-gray-400">Chưa có điểm</div>
              <div v-if="item.feedback" class="text-xs text-gray-500">{{ item.feedback }}</div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Add Grade Item Dialog -->
    <Teleport to="body">
      <div v-if="showAddItemDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" @click.stop>
          <h3 class="text-xl font-bold mb-4">Thêm cột điểm</h3>
          <GradeItemForm 
            @submit="handleAddItem" 
            @cancel="showAddItemDialog = false" 
          />
        </div>
      </div>
    </Teleport>
  </div>
</template>
