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

// Animated background particles - use seeded random to avoid hydration mismatch
const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 9999) * 10000
  return x - Math.floor(x)
}

const particles = Array.from({ length: 50 }, (_, i) => ({
  id: i,
  size: seededRandom(i * 1) * 4 + 2,
  x: seededRandom(i * 2) * 100,
  y: seededRandom(i * 3) * 100,
  duration: seededRandom(i * 4) * 20 + 10,
  delay: seededRandom(i * 5) * -20,
}))
</script>

<template>
  <div class="min-h-screen flex">
    <!-- Left Side - Branding & Illustration -->
    <div class="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary via-primary/90 to-primary/80 overflow-hidden">
      <!-- Animated Background - ClientOnly to avoid hydration mismatch -->
      <ClientOnly>
        <div class="absolute inset-0">
          <div 
            v-for="particle in particles" 
            :key="particle.id"
            class="absolute rounded-full bg-white/10"
            :style="{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animation: `float ${particle.duration}s infinite ease-in-out`,
              animationDelay: `${particle.delay}s`,
            }"
          />
        </div>
      </ClientOnly>
      
      <!-- Grid Pattern Overlay -->
      <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-50" />

      <!-- Content -->
      <div class="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
        <!-- Logo -->
        <div class="mb-8">
          <div class="flex items-center gap-3">
            <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-2xl">
              <svg class="h-9 w-9 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2v-5" />
              </svg>
            </div>
            <span class="text-4xl font-bold tracking-tight">EduLMS</span>
          </div>
        </div>

        <!-- Illustration -->
        <div class="relative w-full max-w-md mb-12">
          <svg class="w-full h-auto" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Book Stack -->
            <rect x="60" y="180" width="80" height="12" rx="2" fill="white" fill-opacity="0.3"/>
            <rect x="55" y="165" width="90" height="12" rx="2" fill="white" fill-opacity="0.4"/>
            <rect x="50" y="150" width="100" height="12" rx="2" fill="white" fill-opacity="0.5"/>
            
            <!-- Laptop -->
            <rect x="150" y="140" width="140" height="90" rx="8" fill="white" fill-opacity="0.2"/>
            <rect x="160" y="150" width="120" height="70" rx="4" fill="white" fill-opacity="0.3"/>
            <rect x="130" y="230" width="180" height="10" rx="5" fill="white" fill-opacity="0.25"/>
            
            <!-- Screen Content - Video Call -->
            <rect x="170" y="160" width="45" height="35" rx="4" fill="white" fill-opacity="0.4"/>
            <rect x="225" y="160" width="45" height="35" rx="4" fill="white" fill-opacity="0.4"/>
            <circle cx="192" cy="172" r="8" fill="white" fill-opacity="0.6"/>
            <circle cx="247" cy="172" r="8" fill="white" fill-opacity="0.6"/>
            
            <!-- Floating Elements -->
            <circle cx="320" cy="80" r="25" fill="white" fill-opacity="0.15"/>
            <path d="M310 80 L330 80 M320 70 L320 90" stroke="white" stroke-opacity="0.5" stroke-width="3"/>
            
            <rect x="280" y="130" width="50" height="40" rx="8" fill="white" fill-opacity="0.15"/>
            <path d="M295 145 L305 155 L315 140" stroke="white" stroke-opacity="0.5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            
            <!-- Graduation Cap -->
            <path d="M80 100 L120 80 L160 100 L120 120 Z" fill="white" fill-opacity="0.3"/>
            <rect x="115" y="100" width="10" height="30" fill="white" fill-opacity="0.3"/>
            <circle cx="120" cy="130" r="5" fill="white" fill-opacity="0.4"/>
          </svg>
        </div>

        <!-- Text Content -->
        <div class="text-center max-w-md">
          <h1 class="text-3xl font-bold mb-4">Nền tảng học trực tuyến hiện đại</h1>
          <p class="text-lg text-white/80 mb-8">
            Kết nối giáo viên và học sinh trong môi trường học tập số, 
            với các tính năng video trực tiếp, bảng trắng tương tác và quản lý bài tập thông minh.
          </p>
          
          <!-- Features -->
          <div class="grid grid-cols-3 gap-4 text-sm">
            <div class="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/10 backdrop-blur-sm">
              <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span>Lớp học ảo</span>
            </div>
            <div class="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/10 backdrop-blur-sm">
              <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
              <span>Video HD</span>
            </div>
            <div class="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/10 backdrop-blur-sm">
              <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <span>Bài tập</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Side - Form -->
    <div class="flex-1 flex items-center justify-center bg-background relative">
      <!-- Subtle Background Pattern -->
      <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0iIzAwMCIgZmlsbC1vcGFjaXR5PSIwLjAzIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] dark:opacity-50" />
      
      <div class="w-full max-w-md px-8 py-12 relative z-10">
        <!-- Mobile Logo -->
        <div class="lg:hidden mb-8 text-center">
          <NuxtLink to="/" class="inline-flex items-center gap-2">
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
              <svg class="h-7 w-7" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2v-5" />
              </svg>
            </div>
            <span class="text-2xl font-bold">EduLMS</span>
          </NuxtLink>
        </div>

        <!-- Content -->
        <slot />

        <!-- Footer -->
        <p class="mt-8 text-center text-sm text-muted-foreground">
          &copy; {{ new Date().getFullYear() }} EduLMS. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes float {
  0%, 100% {
    transform: translateY(0) translateX(0);
    opacity: 0.3;
  }
  25% {
    transform: translateY(-20px) translateX(10px);
    opacity: 0.6;
  }
  50% {
    transform: translateY(-10px) translateX(-10px);
    opacity: 0.4;
  }
  75% {
    transform: translateY(-25px) translateX(5px);
    opacity: 0.5;
  }
}
</style>
