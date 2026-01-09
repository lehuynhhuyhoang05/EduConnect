// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // Dev server port - avoid conflict with backend on 3000
  devServer: {
    port: 3001,
  },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vueuse/nuxt',
  ],

  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:3000/api',
      wsUrl: process.env.NUXT_PUBLIC_WS_URL || 'http://localhost:3000',
    }
  },

  app: {
    head: {
      title: 'EduLMS - Nền tảng học trực tuyến',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Hệ thống quản lý học tập trực tuyến với video call, whiteboard và chat realtime' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' }
      ]
    },
    pageTransition: { name: 'page', mode: 'out-in' }
  },

  css: ['~/assets/css/main.css'],

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    configPath: 'tailwind.config.ts',
  },

  pinia: {
    storesDirs: ['./stores/**'],
  },

  typescript: {
    strict: true
  },

  imports: {
    dirs: ['stores', 'composables', 'utils']
  },

  routeRules: {
    '/': { redirect: '/dashboard' },
  }
})
