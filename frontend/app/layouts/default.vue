<script setup lang="ts">
const authStore = useAuthStore()
const router = useRouter()
const { toasts, removeToast } = useToast()

const isInitializing = ref(true)

// Initialize auth before rendering
onBeforeMount(async () => {
  await authStore.initAuth()
  isInitializing.value = false
  
  if (!authStore.isAuthenticated) {
    router.push('/auth/login')
  }
})

// Watch for auth changes
watch(() => authStore.isAuthenticated, (isAuthenticated) => {
  if (!isAuthenticated && !isInitializing.value) {
    router.push('/auth/login')
  }
})
</script>

<template>
  <div v-if="isInitializing" class="min-h-screen bg-background flex items-center justify-center">
    <div class="text-center">
      <div class="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary"></div>
      <p class="mt-4 text-muted-foreground">Đang tải...</p>
    </div>
  </div>
  
  <div v-else class="min-h-screen bg-background">
    <!-- Navbar -->
    <LayoutNavbar />

    <!-- Main Content -->
    <main class="container mx-auto px-4 py-6">
      <slot />
    </main>

    <!-- Toast Notifications -->
    <Teleport to="body">
      <div class="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
        <TransitionGroup
          enter-active-class="transition-all duration-300"
          enter-from-class="translate-x-full opacity-0"
          enter-to-class="translate-x-0 opacity-100"
          leave-active-class="transition-all duration-200"
          leave-from-class="translate-x-0 opacity-100"
          leave-to-class="translate-x-full opacity-0"
        >
          <UiToast
            v-for="t in toasts"
            :key="t.id"
            :variant="t.variant"
            :title="t.title"
            :description="t.description"
            :duration="t.duration"
            @close="removeToast(t.id)"
          />
        </TransitionGroup>
      </div>
    </Teleport>
  </div>
</template>
