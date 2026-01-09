<script setup lang="ts">
// Redirect to dashboard
definePageMeta({
  middleware: ['auth'],
})

const router = useRouter()
const authStore = useAuthStore()

onMounted(() => {
  authStore.initAuth()
  
  if (authStore.isAuthenticated) {
    router.push('/dashboard')
  } else {
    router.push('/auth/login')
  }
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <UiSpinner size="lg" />
  </div>
</template>
