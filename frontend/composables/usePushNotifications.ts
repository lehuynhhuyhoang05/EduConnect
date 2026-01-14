import { ref } from 'vue'

const isSupported = ref(false)
const isSubscribed = ref(false)
const isLoading = ref(false)
const permission = ref<NotificationPermission>('default')

export function usePushNotifications() {
  const { $api } = useNuxtApp()
  const { toast } = useToast()

  // Check if push notifications are supported
  const checkSupport = () => {
    isSupported.value = 'serviceWorker' in navigator && 'PushManager' in window
    if ('Notification' in window) {
      permission.value = Notification.permission
    }
    return isSupported.value
  }

  // Request notification permission
  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      toast.error('Trình duyệt không hỗ trợ thông báo')
      return false
    }

    const result = await Notification.requestPermission()
    permission.value = result
    
    if (result === 'granted') {
      return true
    } else if (result === 'denied') {
      toast.error('Bạn đã từ chối nhận thông báo')
    }
    return false
  }

  // Register service worker
  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
    if (!('serviceWorker' in navigator)) {
      return null
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service Worker registered:', registration)
      return registration
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      return null
    }
  }

  // Subscribe to push notifications
  const subscribe = async (): Promise<boolean> => {
    if (!checkSupport()) {
      toast.error('Trình duyệt không hỗ trợ Push Notifications')
      return false
    }

    isLoading.value = true

    try {
      // Request permission first
      const granted = await requestPermission()
      if (!granted) {
        isLoading.value = false
        return false
      }

      // Register service worker
      const registration = await registerServiceWorker()
      if (!registration) {
        toast.error('Không thể đăng ký Service Worker')
        isLoading.value = false
        return false
      }

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready

      // Get VAPID public key from server
      const { publicKey } = await $api('/push-notifications/vapid-key')
      
      // Convert VAPID key to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(publicKey)

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      })

      // Send subscription to server
      await $api('/push-notifications/subscribe', {
        method: 'POST',
        body: subscription.toJSON()
      })

      isSubscribed.value = true
      toast.success('Đã đăng ký nhận thông báo!')
      return true

    } catch (error: any) {
      console.error('Push subscription error:', error)
      toast.error('Không thể đăng ký nhận thông báo', error.message)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Unsubscribe from push notifications
  const unsubscribe = async (): Promise<boolean> => {
    isLoading.value = true

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe()

        // Remove subscription from server
        await $api('/push-notifications/unsubscribe', {
          method: 'DELETE',
          body: { endpoint: subscription.endpoint }
        })
      }

      isSubscribed.value = false
      toast.success('Đã hủy đăng ký thông báo')
      return true

    } catch (error: any) {
      console.error('Push unsubscribe error:', error)
      toast.error('Không thể hủy đăng ký', error.message)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Check current subscription status
  const checkSubscription = async (): Promise<boolean> => {
    if (!isSupported.value) return false

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      isSubscribed.value = !!subscription
      return isSubscribed.value
    } catch {
      return false
    }
  }

  // Toggle subscription
  const toggle = async (): Promise<boolean> => {
    if (isSubscribed.value) {
      return await unsubscribe()
    } else {
      return await subscribe()
    }
  }

  // Initialize
  const init = async () => {
    checkSupport()
    if (isSupported.value) {
      await checkSubscription()
    }
  }

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    checkSupport,
    requestPermission,
    subscribe,
    unsubscribe,
    checkSubscription,
    toggle,
    init
  }
}

// Utility function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
