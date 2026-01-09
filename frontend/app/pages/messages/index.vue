<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const isLoading = ref(true)
const messageInput = ref('')
const isSending = ref(false)
const searchQuery = ref('')
const showNewChatModal = ref(false)
const selectedConversation = ref<any>(null)
const messagesContainer = ref<HTMLElement | null>(null)

// Conversations list
const conversations = ref([
  {
    id: 1,
    type: 'direct',
    name: 'Nguyễn Văn A',
    avatar: null,
    lastMessage: 'Thầy ơi, em có thắc mắc về bài tập Python ạ',
    lastMessageTime: '2024-12-21T10:30:00',
    unread: 2,
    online: true
  },
  {
    id: 2,
    type: 'group',
    name: 'Lớp Lập trình Python - CS101',
    avatar: null,
    lastMessage: 'Nguyễn Văn B: Các bạn ơi, ai làm được bài 5 chưa?',
    lastMessageTime: '2024-12-21T09:45:00',
    unread: 5,
    online: false,
    members: 35
  },
  {
    id: 3,
    type: 'direct',
    name: 'Trần Thị B',
    avatar: null,
    lastMessage: 'Cảm ơn thầy đã giúp đỡ ạ!',
    lastMessageTime: '2024-12-20T18:20:00',
    unread: 0,
    online: false
  },
  {
    id: 4,
    type: 'group',
    name: 'Nhóm dự án AI',
    avatar: null,
    lastMessage: 'Lê Văn C: Mình đã cập nhật code lên GitHub',
    lastMessageTime: '2024-12-20T15:00:00',
    unread: 0,
    online: false,
    members: 5
  },
  {
    id: 5,
    type: 'direct',
    name: 'Phạm Văn D',
    avatar: null,
    lastMessage: 'Dạ vâng em hiểu rồi ạ',
    lastMessageTime: '2024-12-19T12:10:00',
    unread: 0,
    online: true
  },
])

// Messages for selected conversation
const messages = ref<Array<{
  id: number
  senderId: number
  senderName: string
  content: string
  timestamp: string
  isMe: boolean
  type: 'text' | 'file' | 'image'
  file?: { name: string; size: string; url: string }
  reactions?: string[]
}>>([])

// Sample messages data
const sampleMessages: Record<number, any[]> = {
  1: [
    { id: 1, senderId: 2, senderName: 'Nguyễn Văn A', content: 'Thầy ơi, em chào thầy ạ', timestamp: '2024-12-21T10:00:00', isMe: false, type: 'text' },
    { id: 2, senderId: 1, senderName: 'Tôi', content: 'Chào em, thầy có thể giúp gì cho em?', timestamp: '2024-12-21T10:05:00', isMe: true, type: 'text' },
    { id: 3, senderId: 2, senderName: 'Nguyễn Văn A', content: 'Thầy ơi, em có thắc mắc về bài tập Python ạ', timestamp: '2024-12-21T10:30:00', isMe: false, type: 'text' },
    { id: 4, senderId: 2, senderName: 'Nguyễn Văn A', content: 'Em không hiểu phần xử lý exception', timestamp: '2024-12-21T10:31:00', isMe: false, type: 'text' },
  ],
  2: [
    { id: 1, senderId: 3, senderName: 'Lê Văn C', content: 'Các bạn ơi, tuần này mình có bài kiểm tra không nhỉ?', timestamp: '2024-12-21T08:00:00', isMe: false, type: 'text' },
    { id: 2, senderId: 4, senderName: 'Phạm Thị D', content: 'Có bạn ơi, thứ 5 tuần này nè', timestamp: '2024-12-21T08:15:00', isMe: false, type: 'text' },
    { id: 3, senderId: 1, senderName: 'Tôi', content: 'Các em chuẩn bị ôn tập chương 3-4 nhé', timestamp: '2024-12-21T08:30:00', isMe: true, type: 'text' },
    { id: 4, senderId: 5, senderName: 'Hoàng Văn E', content: '🙏 Dạ vâng ạ', timestamp: '2024-12-21T08:35:00', isMe: false, type: 'text' },
    { id: 5, senderId: 6, senderName: 'Nguyễn Văn B', content: 'Các bạn ơi, ai làm được bài 5 chưa?', timestamp: '2024-12-21T09:45:00', isMe: false, type: 'text' },
  ]
}

const filteredConversations = computed(() => {
  if (!searchQuery.value) return conversations.value
  return conversations.value.filter(c => 
    c.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const totalUnread = computed(() => {
  return conversations.value.reduce((sum, c) => sum + c.unread, 0)
})

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  } else if (days === 1) {
    return 'Hôm qua'
  } else if (days < 7) {
    return date.toLocaleDateString('vi-VN', { weekday: 'short' })
  }
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

const formatMessageTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString('vi-VN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

const selectConversation = (conv: any) => {
  selectedConversation.value = conv
  conv.unread = 0
  
  // Load messages
  messages.value = sampleMessages[conv.id] || []
  
  // Scroll to bottom
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const sendMessage = async () => {
  if (!messageInput.value.trim() || !selectedConversation.value) return
  
  isSending.value = true
  
  const newMessage = {
    id: messages.value.length + 1,
    senderId: 1,
    senderName: 'Tôi',
    content: messageInput.value,
    timestamp: new Date().toISOString(),
    isMe: true,
    type: 'text' as const
  }
  
  messages.value.push(newMessage)
  
  // Update conversation last message
  selectedConversation.value.lastMessage = messageInput.value
  selectedConversation.value.lastMessageTime = newMessage.timestamp
  
  messageInput.value = ''
  
  // Scroll to bottom
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
  
  // Simulate send
  await new Promise(resolve => setTimeout(resolve, 300))
  isSending.value = false
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

onMounted(() => {
  setTimeout(() => {
    isLoading.value = false
    
    // Auto select first conversation
    if (conversations.value.length > 0) {
      selectConversation(conversations.value[0])
    }
  }, 500)
})
</script>

<template>
  <div class="h-[calc(100vh-64px)] bg-gray-50/50 flex">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p class="text-gray-500">Đang tải tin nhắn...</p>
      </div>
    </div>

    <template v-else>
      <!-- Conversations Sidebar -->
      <div class="w-80 bg-white border-r border-gray-200 flex flex-col">
        <!-- Header -->
        <div class="p-4 border-b border-gray-100">
          <div class="flex items-center justify-between mb-4">
            <h1 class="text-xl font-bold text-gray-900">Tin nhắn</h1>
            <div class="flex items-center gap-2">
              <span v-if="totalUnread > 0" class="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                {{ totalUnread }} mới
              </span>
              <button 
                class="w-9 h-9 rounded-xl bg-primary text-white hover:bg-primary/90 flex items-center justify-center transition-colors"
                @click="showNewChatModal = true"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
          
          <!-- Search -->
          <div class="relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              v-model="searchQuery"
              type="text"
              placeholder="Tìm kiếm hội thoại..."
              class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        <!-- Conversations List -->
        <div class="flex-1 overflow-y-auto">
          <div 
            v-for="conv in filteredConversations" 
            :key="conv.id"
            class="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
            :class="selectedConversation?.id === conv.id ? 'bg-primary/5 border-r-2 border-primary' : 'hover:bg-gray-50'"
            @click="selectConversation(conv)"
          >
            <!-- Avatar -->
            <div class="relative flex-shrink-0">
              <div 
                class="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                :class="conv.type === 'group' ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-primary to-purple-600'"
              >
                <span v-if="conv.type === 'direct'">{{ conv.name.charAt(0) }}</span>
                <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div 
                v-if="conv.type === 'direct' && conv.online" 
                class="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"
              />
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-1">
                <h3 class="font-semibold text-gray-900 truncate text-sm">{{ conv.name }}</h3>
                <span class="text-xs text-gray-500 flex-shrink-0">{{ formatTime(conv.lastMessageTime) }}</span>
              </div>
              <div class="flex items-center justify-between">
                <p class="text-sm text-gray-500 truncate">{{ conv.lastMessage }}</p>
                <span 
                  v-if="conv.unread > 0" 
                  class="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-medium"
                >
                  {{ conv.unread > 9 ? '9+' : conv.unread }}
                </span>
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div v-if="filteredConversations.length === 0" class="flex flex-col items-center justify-center py-12 px-4">
            <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p class="text-gray-500 text-center">Không tìm thấy hội thoại</p>
          </div>
        </div>
      </div>

      <!-- Chat Area -->
      <div class="flex-1 flex flex-col bg-white">
        <template v-if="selectedConversation">
          <!-- Chat Header -->
          <div class="h-16 px-6 border-b border-gray-100 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="relative">
                <div 
                  class="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                  :class="selectedConversation.type === 'group' ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-primary to-purple-600'"
                >
                  <span v-if="selectedConversation.type === 'direct'">{{ selectedConversation.name.charAt(0) }}</span>
                  <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div 
                  v-if="selectedConversation.type === 'direct' && selectedConversation.online" 
                  class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"
                />
              </div>
              <div>
                <h2 class="font-semibold text-gray-900">{{ selectedConversation.name }}</h2>
                <p class="text-xs text-gray-500">
                  <template v-if="selectedConversation.type === 'direct'">
                    {{ selectedConversation.online ? 'Đang hoạt động' : 'Offline' }}
                  </template>
                  <template v-else>
                    {{ selectedConversation.members }} thành viên
                  </template>
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button class="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors">
                <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
              <button class="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors">
                <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button class="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors">
                <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Messages -->
          <div 
            ref="messagesContainer"
            class="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50/50 to-white"
          >
            <div 
              v-for="(message, index) in messages" 
              :key="message.id"
              class="flex"
              :class="message.isMe ? 'justify-end' : 'justify-start'"
            >
              <!-- Avatar for other users -->
              <div 
                v-if="!message.isMe && (index === 0 || messages[index - 1].senderId !== message.senderId)"
                class="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-sm font-medium mr-2 flex-shrink-0"
              >
                {{ message.senderName.charAt(0) }}
              </div>
              <div v-else-if="!message.isMe" class="w-8 mr-2" />

              <div :class="message.isMe ? 'max-w-md' : 'max-w-md'">
                <!-- Sender name for group chats -->
                <p 
                  v-if="!message.isMe && selectedConversation.type === 'group' && (index === 0 || messages[index - 1].senderId !== message.senderId)"
                  class="text-xs text-gray-500 mb-1 ml-1"
                >
                  {{ message.senderName }}
                </p>
                
                <div 
                  class="px-4 py-2.5 rounded-2xl"
                  :class="message.isMe 
                    ? 'bg-gradient-to-r from-primary to-purple-600 text-white rounded-br-md' 
                    : 'bg-white shadow-sm border border-gray-100 text-gray-700 rounded-bl-md'"
                >
                  <p class="text-sm whitespace-pre-wrap">{{ message.content }}</p>
                </div>
                
                <p 
                  class="text-xs mt-1 px-1"
                  :class="message.isMe ? 'text-right text-gray-400' : 'text-gray-400'"
                >
                  {{ formatMessageTime(message.timestamp) }}
                </p>
              </div>
            </div>

            <!-- Typing indicator -->
            <div v-if="false" class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                A
              </div>
              <div class="px-4 py-3 bg-white shadow-sm border border-gray-100 rounded-2xl rounded-bl-md">
                <div class="flex gap-1">
                  <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms" />
                  <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms" />
                  <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms" />
                </div>
              </div>
            </div>
          </div>

          <!-- Message Input -->
          <div class="p-4 border-t border-gray-100 bg-white">
            <div class="flex items-end gap-3">
              <!-- Attachment Button -->
              <button class="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors flex-shrink-0">
                <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>

              <!-- Input -->
              <div class="flex-1 relative">
                <textarea 
                  v-model="messageInput"
                  placeholder="Nhập tin nhắn..."
                  class="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  rows="1"
                  @keydown="handleKeyDown"
                />
                
                <!-- Emoji Button -->
                <button class="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg hover:bg-gray-200 flex items-center justify-center transition-colors">
                  <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>

              <!-- Send Button -->
              <button 
                class="w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                :class="messageInput.trim() 
                  ? 'bg-gradient-to-r from-primary to-purple-600 text-white hover:shadow-lg hover:shadow-primary/25' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'"
                :disabled="!messageInput.trim() || isSending"
                @click="sendMessage"
              >
                <svg v-if="isSending" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </template>

        <!-- No conversation selected -->
        <div v-else class="flex-1 flex flex-col items-center justify-center text-center px-6">
          <div class="w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-purple-100 flex items-center justify-center mb-6">
            <svg class="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2">Chào mừng đến với tin nhắn</h2>
          <p class="text-gray-500 mb-6 max-w-sm">Chọn một hội thoại từ danh sách bên trái để bắt đầu trò chuyện</p>
          <button 
            class="px-6 py-3 bg-gradient-to-r from-primary to-purple-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all"
            @click="showNewChatModal = true"
          >
            Bắt đầu cuộc trò chuyện mới
          </button>
        </div>
      </div>
    </template>

    <!-- New Chat Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div 
          v-if="showNewChatModal" 
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          @click.self="showNewChatModal = false"
        >
          <Transition
            enter-active-class="transition-all duration-300"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition-all duration-200"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div v-if="showNewChatModal" class="w-full max-w-md bg-white rounded-2xl shadow-xl">
              <div class="p-6 border-b border-gray-100">
                <div class="flex items-center justify-between">
                  <h2 class="text-xl font-bold text-gray-900">Cuộc trò chuyện mới</h2>
                  <button 
                    class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
                    @click="showNewChatModal = false"
                  >
                    <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div class="p-6">
                <!-- Search Input -->
                <div class="relative mb-4">
                  <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input 
                    type="text"
                    placeholder="Tìm kiếm người dùng..."
                    class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                <!-- Suggested Users -->
                <p class="text-sm font-medium text-gray-700 mb-3">Gợi ý</p>
                <div class="space-y-2 max-h-60 overflow-y-auto">
                  <div 
                    v-for="i in 5" 
                    :key="i"
                    class="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-semibold">
                      {{ String.fromCharCode(64 + i) }}
                    </div>
                    <div class="flex-1">
                      <p class="font-medium text-gray-900 text-sm">Người dùng {{ i }}</p>
                      <p class="text-xs text-gray-500">user{{ i }}@email.com</p>
                    </div>
                    <button class="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
                      Nhắn tin
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>