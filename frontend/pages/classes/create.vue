<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
})

const router = useRouter()
const classesStore = useClassesStore()
const { toast } = useToast()

const form = reactive({
  name: '',
  description: '',
  subject: '',
})

const errors = reactive({
  name: '',
  description: '',
})

const isLoading = ref(false)

const validateForm = () => {
  let isValid = true
  errors.name = ''
  errors.description = ''

  if (!form.name.trim()) {
    errors.name = 'Vui lòng nhập tên lớp học'
    isValid = false
  } else if (form.name.length < 3) {
    errors.name = 'Tên lớp học phải có ít nhất 3 ký tự'
    isValid = false
  }

  return isValid
}

const handleSubmit = async () => {
  if (!validateForm()) return

  isLoading.value = true

  try {
    const newClass = await classesStore.createClass({
      name: form.name,
      description: form.description,
      subject: form.subject,
    })

    toast.success('Tạo lớp học thành công!', `Mã lớp: ${newClass.code}`)
    router.push(`/classes/${newClass.id}`)
  } catch (error: any) {
    toast.error('Không thể tạo lớp học', error.message || 'Vui lòng thử lại')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
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
        title="Tạo lớp học mới"
        description="Điền thông tin để tạo lớp học. Sau khi tạo, bạn sẽ nhận được mã lớp để chia sẻ cho học sinh."
      />
      <UiCardContent>
        <form class="space-y-6" @submit.prevent="handleSubmit">
          <UiInput
            v-model="form.name"
            label="Tên lớp học"
            placeholder="VD: Lập trình Web - K15"
            :error="errors.name"
            hint="Tên lớp học sẽ hiển thị cho tất cả thành viên"
          />

          <UiTextarea
            v-model="form.description"
            label="Mô tả"
            placeholder="Mô tả ngắn về lớp học..."
            :rows="4"
            hint="Không bắt buộc"
          />

          <UiInput
            v-model="form.subject"
            label="Môn học"
            placeholder="VD: Công nghệ thông tin"
            hint="Không bắt buộc"
          />

          <div class="flex gap-3">
            <UiButton
              type="button"
              variant="outline"
              @click="router.back()"
            >
              Hủy
            </UiButton>
            <UiButton
              type="submit"
              :loading="isLoading"
              :disabled="isLoading"
              class="flex-1"
            >
              Tạo lớp học
            </UiButton>
          </div>
        </form>
      </UiCardContent>
    </UiCard>
  </div>
</template>
