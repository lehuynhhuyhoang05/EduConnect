import { io, Socket } from 'socket.io-client'

interface DrawingPoint {
  x: number
  y: number
  pressure?: number
  timestamp?: number
}

interface StrokeData {
  strokeId: string
  roomId: string
  roomType: string
  userId: number
  userName: string
  tool: 'pen' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle' | 'arrow' | 'text'
  path: DrawingPoint[]
  color: string
  strokeWidth: number
  opacity: number
  createdAt: Date
}

interface ShapeData {
  shapeId: string
  roomId: string
  roomType: string
  userId: number
  userName: string
  tool: 'line' | 'rect' | 'circle' | 'arrow'
  startPoint: DrawingPoint
  endPoint: DrawingPoint
  color: string
  strokeWidth: number
  fill?: string
  opacity: number
}

interface TextData {
  textId: string
  roomId: string
  roomType: string
  userId: number
  userName: string
  position: DrawingPoint
  content: string
  fontSize: number
  color: string
  fontFamily: string
}

export function useWhiteboardSocket() {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()
  
  const socket = ref<Socket | null>(null)
  const isConnected = ref(false)
  const currentRoom = ref<string | null>(null)
  
  // Strokes storage
  const strokes = ref<Map<string, StrokeData>>(new Map())
  const shapes = ref<Map<string, ShapeData>>(new Map())
  const texts = ref<Map<string, TextData>>(new Map())
  
  // Event callbacks
  const onStrokeStart = ref<((data: StrokeData) => void) | null>(null)
  const onStrokeMove = ref<((data: { strokeId: string; points: DrawingPoint[] }) => void) | null>(null)
  const onStrokeEnd = ref<((data: StrokeData) => void) | null>(null)
  const onShapeDrawn = ref<((data: ShapeData) => void) | null>(null)
  const onTextAdded = ref<((data: TextData) => void) | null>(null)
  const onStrokeErased = ref<((strokeId: string) => void) | null>(null)
  const onUndo = ref<((data: { userId: number; strokeId: string }) => void) | null>(null)
  const onClear = ref<(() => void) | null>(null)
  const onSyncState = ref<((data: { strokes: StrokeData[] }) => void) | null>(null)
  
  const connect = () => {
    if (socket.value?.connected) return
    
    const apiUrl = config.public.apiUrl?.replace('/api', '') || 'http://localhost:3000'
    
    socket.value = io(`${apiUrl}/whiteboard`, {
      auth: {
        token: authStore.token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })
    
    socket.value.on('connect', () => {
      console.log('Whiteboard socket connected:', socket.value?.id)
      isConnected.value = true
    })
    
    socket.value.on('wb:connected', (data) => {
      console.log('Whiteboard server confirmed:', data)
    })
    
    socket.value.on('disconnect', (reason) => {
      console.log('Whiteboard socket disconnected:', reason)
      isConnected.value = false
    })
    
    // Stroke events - listen for both old and new event names for compatibility
    socket.value.on('wb:stroke-start', (data: StrokeData) => {
      console.log('wb:stroke-start received:', data)
      strokes.value.set(data.strokeId, data)
      onStrokeStart.value?.(data)
    })
    
    socket.value.on('wb:stroke-started', (data: any) => {
      console.log('wb:stroke-started received:', data)
      const strokeData: Partial<StrokeData> & { strokeId: string; userId: number; path: DrawingPoint[] } = {
        strokeId: data.strokeId,
        userId: data.userId,
        userName: data.userName,
        tool: data.tool,
        color: data.color,
        strokeWidth: data.strokeWidth,
        opacity: data.opacity,
        path: data.startPoint ? [data.startPoint] : [],
      }
      strokes.value.set(data.strokeId, strokeData as StrokeData)
      onStrokeStart.value?.(strokeData as StrokeData)
    })
    
    socket.value.on('wb:stroke-move', (data: { strokeId: string; points: DrawingPoint[] }) => {
      console.log('wb:stroke-move received:', data)
      const stroke = strokes.value.get(data.strokeId)
      if (stroke) {
        stroke.path.push(...data.points)
      }
      onStrokeMove.value?.(data)
    })
    
    socket.value.on('wb:stroke-end', (data: StrokeData) => {
      console.log('wb:stroke-end received:', data)
      strokes.value.set(data.strokeId, data)
      onStrokeEnd.value?.(data)
    })
    
    socket.value.on('wb:stroke-completed', (data: any) => {
      console.log('wb:stroke-completed received:', data)
      // Update the stroke with complete data
      if (data.path && data.path.length > 0) {
        const strokeData: Partial<StrokeData> & { strokeId: string; userId: number; path: DrawingPoint[] } = {
          strokeId: data.strokeId,
          userId: data.userId,
          userName: data.userName,
          tool: data.tool,
          color: data.color,
          strokeWidth: data.strokeWidth,
          opacity: data.opacity,
          path: data.path,
        }
        strokes.value.set(data.strokeId, strokeData as StrokeData)
      }
      onStrokeEnd.value?.(data as StrokeData)
    })
    
    socket.value.on('wb:shape-drawn', (data: ShapeData) => {
      console.log('wb:shape-drawn received:', data)
      shapes.value.set(data.shapeId, data)
      onShapeDrawn.value?.(data)
    })
    
    socket.value.on('wb:text-added', (data: TextData) => {
      console.log('wb:text-added received:', data)
      texts.value.set(data.textId, data)
      onTextAdded.value?.(data)
    })
    
    socket.value.on('wb:stroke-erased', (data: { strokeId: string }) => {
      console.log('wb:stroke-erased received:', data)
      strokes.value.delete(data.strokeId)
      shapes.value.delete(data.strokeId)
      texts.value.delete(data.strokeId)
      onStrokeErased.value?.(data.strokeId)
    })
    
    socket.value.on('wb:undo', (data: { userId: number; strokeId: string }) => {
      console.log('wb:undo received:', data)
      strokes.value.delete(data.strokeId)
      shapes.value.delete(data.strokeId)
      texts.value.delete(data.strokeId)
      onUndo.value?.(data)
    })
    
    socket.value.on('wb:stroke-undone', (data: { userId: number; strokeId: string }) => {
      console.log('wb:stroke-undone received:', data)
      strokes.value.delete(data.strokeId)
      shapes.value.delete(data.strokeId)
      texts.value.delete(data.strokeId)
      onUndo.value?.(data)
    })
    
    socket.value.on('wb:cleared', () => {
      console.log('wb:cleared received')
      strokes.value.clear()
      shapes.value.clear()
      texts.value.clear()
      onClear.value?.()
    })
    
    socket.value.on('wb:sync-state', (data: { strokes: StrokeData[] }) => {
      console.log('wb:sync-state received:', data)
      strokes.value.clear()
      data.strokes.forEach(s => strokes.value.set(s.strokeId, s))
      onSyncState.value?.(data)
    })
  }
  
  const disconnect = () => {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
      isConnected.value = false
    }
  }
  
  const joinRoom = (roomId: string, roomType: string = 'live-session') => {
    if (!socket.value?.connected) return
    currentRoom.value = `wb:${roomType}:${roomId}`
    socket.value.emit('wb:join-room', { roomId, roomType })
  }
  
  const leaveRoom = (roomId: string, roomType: string = 'live-session') => {
    if (!socket.value?.connected) return
    socket.value.emit('wb:leave-room', { roomId, roomType })
    currentRoom.value = null
  }
  
  const startStroke = (data: {
    strokeId: string
    roomId: string
    roomType?: string
    tool: 'pen' | 'highlighter' | 'eraser'
    startPoint: DrawingPoint
    color: string
    strokeWidth: number
    opacity?: number
  }) => {
    socket.value?.emit('wb:start-stroke', {
      ...data,
      roomType: data.roomType || 'live-session',
    })
  }
  
  const drawMove = (data: {
    strokeId: string
    roomId: string
    roomType?: string
    points: DrawingPoint[]
  }) => {
    socket.value?.emit('wb:draw-move', {
      ...data,
      roomType: data.roomType || 'live-session',
    })
  }
  
  const endStroke = (data: {
    strokeId: string
    roomId: string
    roomType?: string
  }) => {
    socket.value?.emit('wb:end-stroke', {
      ...data,
      roomType: data.roomType || 'live-session',
    })
  }
  
  const drawShape = (data: {
    shapeId: string
    roomId: string
    roomType?: string
    tool: 'line' | 'rect' | 'circle' | 'arrow'
    startPoint: DrawingPoint
    endPoint: DrawingPoint
    color: string
    strokeWidth: number
    fill?: string
    opacity?: number
  }) => {
    socket.value?.emit('wb:draw-shape', {
      ...data,
      roomType: data.roomType || 'live-session',
    })
  }
  
  const addText = (data: {
    textId: string
    roomId: string
    roomType?: string
    position: DrawingPoint
    content: string
    fontSize: number
    color: string
    fontFamily?: string
  }) => {
    socket.value?.emit('wb:draw-text', {
      ...data,
      roomType: data.roomType || 'live-session',
    })
  }
  
  const eraseStroke = (strokeId: string, roomId: string, roomType: string = 'live-session') => {
    socket.value?.emit('wb:erase-stroke', { strokeId, roomId, roomType })
  }
  
  const undo = (roomId: string, roomType: string = 'live-session') => {
    socket.value?.emit('wb:undo', { roomId, roomType })
  }
  
  const clear = (roomId: string, roomType: string = 'live-session') => {
    socket.value?.emit('wb:clear', { roomId, roomType })
  }
  
  const requestSync = (roomId: string, roomType: string = 'live-session') => {
    socket.value?.emit('wb:sync-request', { roomId, roomType })
  }
  
  return {
    socket: readonly(socket),
    isConnected: readonly(isConnected),
    strokes: readonly(strokes),
    shapes: readonly(shapes),
    texts: readonly(texts),
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    startStroke,
    drawMove,
    endStroke,
    drawShape,
    addText,
    eraseStroke,
    undo,
    clear,
    requestSync,
    // Event callbacks
    onStrokeStart,
    onStrokeMove,
    onStrokeEnd,
    onShapeDrawn,
    onTextAdded,
    onStrokeErased,
    onUndo,
    onClear,
    onSyncState,
  }
}
