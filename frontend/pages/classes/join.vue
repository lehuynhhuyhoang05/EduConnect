<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
})

const router = useRouter()
const classesStore = useClassesStore()
const { toast } = useToast()

const classCode = ref('')
const isLoading = ref(false)
const error = ref('')

const handleSubmit = async () => {
  if (!classCode.value.trim()) {
    error.value = 'Vui lòng nhập mã lớp học'
    return
  }

  error.value = ''
  isLoading.value = true

  try {
    const joinedClass = await classesStore.joinClass(classCode.value.trim())
    toast.success('Tham gia lớp học thành công!', `Chào mừng bạn đến với ${joinedClass.name}`)
    router.push(`/classes/${joinedClass.id}`)
  } catch (err: any) {
    error.value = err.message || 'Mã lớp không hợp lệ hoặc bạn đã là thành viên'
    toast.error('Không thể tham gia lớp học', error.value)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <div class="mb-6">
      <NuxtLink to="/classes" class="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <svg class="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Quay lại
      </NuxtLink>
    </div>

    <UiCard>
      <UiCardHeader
        title="Tham gia lớp học"
        description="Nhập mã lớp do giáo viên cung cấp để tham gia lớp học"
      />
      <UiCardContent>
        <form class="space-y-6" @submit.prevent="handleSubmit">
          <div class="space-y-2">
            <label class="text-sm font-medium">Mã lớp học</label>
            <input
              v-model="classCode"
              type="text"
              placeholder="VD: ABC123"
              class="h-12 w-full rounded-lg border border-input bg-background px-4 text-center text-xl font-mono uppercase tracking-widest ring-offset-background placeholder:text-muted-foreground placeholder:text-base placeholder:font-normal placeholder:tracking-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              :class="{ 'border-destructive': error }"
              maxlength="10"
              @input="classCode = classCode.toUpperCase(); error = ''"
            />
            <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
            <p v-else class="text-sm text-muted-foreground">
              Mã lớp gồm các chữ cái và số, do giáo viên cung cấp
            </p>
          </div>

          <UiButton
            type="submit"
            :loading="isLoading"
            :disabled="isLoading || !classCode.trim()"
            class="w-full"
          >
            Tham gia
          </UiButton>
        </form>
      </UiCardContent>
    </UiCard>

    <!-- Info -->
    <div class="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
      <div class="flex gap-3">
        <svg class="h-5 w-5 shrink-0 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        <div class="text-sm text-blue-800 dark:text-blue-200">
          <p class="font-medium">Làm sao để có mã lớp?</p>
          <p class="mt-1 opacity-80">
            Hỏi giáo viên của bạn để nhận mã lớp học. Mã này thường được chia sẻ qua email, nhóm chat hoặc thông báo trên lớp.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
