<script setup lang="ts">
const authStore = useAuthStore()
const router = useRouter()

// Redirect if already authenticated
onMounted(() => {
  authStore.initAuth()
  
  if (authStore.isAuthenticated) {
    router.push('/dashboard')
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
    <!-- Background Pattern -->
    <div class="absolute inset-0 -z-10 h-full w-full bg-white [background:radial-gradient(125%_125%_at_50%_10%,#fff_40%,hsl(var(--primary))_100%)] dark:[background:radial-gradient(125%_125%_at_50%_10%,#020817_40%,hsl(var(--primary))_100%)] opacity-40" />

    <div class="w-full max-w-md px-4">
      <!-- Logo -->
      <div class="mb-8 text-center">
        <NuxtLink to="/" class="inline-flex items-center gap-2">
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <svg class="h-7 w-7" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2v-5" />
            </svg>
          </div>
          <span class="text-2xl font-bold">EduLMS</span>
        </NuxtLink>
        <p class="mt-2 text-muted-foreground">
          Nền tảng học trực tuyến hiện đại
        </p>
      </div>

      <!-- Content -->
      <slot />

      <!-- Footer -->
      <p class="mt-8 text-center text-sm text-muted-foreground">
        &copy; {{ new Date().getFullYear() }} EduLMS. All rights reserved.
      </p>
    </div>
  </div>
</template>
