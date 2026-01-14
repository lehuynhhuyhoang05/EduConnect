<script setup lang="ts">
import type { GradeEntry, GradeItem, StudentGrades } from '~/stores/gradebook'

const props = defineProps<{
  gradeItems: GradeItem[]
  gradeEntries: GradeEntry[]
  students: { id: number; fullName: string; email: string }[]
  canEdit?: boolean
}>()

const emit = defineEmits<{
  updateGrade: [entryId: number, data: { points?: number; feedback?: string }]
  createGrade: [data: { studentId: number; gradeItemId: number; points: number; feedback?: string }]
}>()

const editingCell = ref<string | null>(null)
const editValue = ref<number>(0)
const editFeedback = ref('')

const getGradeEntry = (studentId: number, itemId: number) => {
  return props.gradeEntries.find(
    e => e.studentId === studentId && e.gradeItemId === itemId
  )
}

const getStudentTotal = (studentId: number): { earned: number; possible: number; percentage: number } => {
  let earned = 0
  let possible = 0
  
  for (const item of props.gradeItems) {
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

const startEdit = (studentId: number, itemId: number) => {
  if (!props.canEdit) return
  
  const key = `${studentId}-${itemId}`
  const entry = getGradeEntry(studentId, itemId)
  
  editingCell.value = key
  editValue.value = entry?.points ?? 0
  editFeedback.value = entry?.feedback ?? ''
}

const saveEdit = (studentId: number, itemId: number) => {
  const entry = getGradeEntry(studentId, itemId)
  
  if (entry) {
    emit('updateGrade', entry.id, { 
      points: editValue.value,
      feedback: editFeedback.value || undefined
    })
  } else {
    emit('createGrade', {
      studentId,
      gradeItemId: itemId,
      points: editValue.value,
      feedback: editFeedback.value || undefined
    })
  }
  
  editingCell.value = null
}

const cancelEdit = () => {
  editingCell.value = null
}

const getGradeColor = (percentage: number) => {
  if (percentage >= 90) return 'text-green-500'
  if (percentage >= 80) return 'text-blue-500'
  if (percentage >= 70) return 'text-yellow-500'
  if (percentage >= 60) return 'text-orange-500'
  return 'text-red-500'
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full border-collapse">
      <thead>
        <tr class="bg-muted">
          <th class="p-3 text-left border-b sticky left-0 bg-muted z-10">Học sinh</th>
          <th 
            v-for="item in gradeItems" 
            :key="item.id"
            class="p-3 text-center border-b min-w-[120px]"
          >
            <div class="font-medium">{{ item.name }}</div>
            <div class="text-xs text-muted-foreground">{{ item.maxPoints }} điểm</div>
            <div class="text-xs text-muted-foreground capitalize">{{ item.category }}</div>
          </th>
          <th class="p-3 text-center border-b min-w-[100px] bg-muted/50">Tổng</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="student in students" :key="student.id" class="hover:bg-muted/50">
          <td class="p-3 border-b sticky left-0 bg-background z-10">
            <div class="font-medium">{{ student.fullName }}</div>
            <div class="text-xs text-muted-foreground">{{ student.email }}</div>
          </td>
          
          <td 
            v-for="item in gradeItems" 
            :key="item.id"
            class="p-3 text-center border-b"
          >
            <div 
              v-if="editingCell !== `${student.id}-${item.id}`"
              @click="startEdit(student.id, item.id)"
              :class="[
                'cursor-pointer p-2 rounded hover:bg-muted transition',
                canEdit && 'hover:ring-2 hover:ring-primary/50'
              ]"
            >
              <template v-if="getGradeEntry(student.id, item.id)">
                <span class="font-medium">
                  {{ getGradeEntry(student.id, item.id)!.points }}
                </span>
                <span class="text-muted-foreground">/{{ item.maxPoints }}</span>
              </template>
              <span v-else class="text-muted-foreground">-</span>
            </div>
            
            <!-- Edit mode -->
            <div v-else class="space-y-2">
              <input
                v-model.number="editValue"
                type="number"
                :min="0"
                :max="item.maxPoints"
                class="w-20 p-1 text-center rounded border border-primary bg-background focus:outline-none"
                @keyup.enter="saveEdit(student.id, item.id)"
                @keyup.escape="cancelEdit"
              />
              <div class="flex justify-center gap-1">
                <button 
                  @click="saveEdit(student.id, item.id)"
                  class="p-1 text-green-500 hover:bg-green-500/10 rounded"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button 
                  @click="cancelEdit"
                  class="p-1 text-red-500 hover:bg-red-500/10 rounded"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </td>
          
          <!-- Total column -->
          <td class="p-3 text-center border-b bg-muted/30">
            <div :class="['font-bold', getGradeColor(getStudentTotal(student.id).percentage)]">
              {{ getStudentTotal(student.id).percentage.toFixed(1) }}%
            </div>
            <div class="text-xs text-muted-foreground">
              {{ getStudentTotal(student.id).earned }}/{{ getStudentTotal(student.id).possible }}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    
    <div v-if="students.length === 0" class="p-8 text-center text-muted-foreground">
      Chưa có học sinh trong lớp
    </div>
  </div>
</template>
