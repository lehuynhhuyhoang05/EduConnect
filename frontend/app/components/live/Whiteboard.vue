<script setup lang="ts">
// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36)

interface Props {
  roomId: string
  isOpen: boolean
  canDraw?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  canDraw: true
})

const emit = defineEmits<{
  close: []
}>()

const whiteboardSocket = useWhiteboardSocket()
const { toast } = useToast()

// Canvas refs
const canvasRef = ref<HTMLCanvasElement | null>(null)
const ctx = ref<CanvasRenderingContext2D | null>(null)
const canvasContainer = ref<HTMLDivElement | null>(null)

// Canvas state
const canvasWidth = ref(1920)
const canvasHeight = ref(1080)
const scale = ref(1)

// Drawing state
const isDrawing = ref(false)
const currentStrokeId = ref<string | null>(null)
const lastPoint = ref<{ x: number; y: number } | null>(null)

// Tools
type Tool = 'pen' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle' | 'arrow' | 'text'
const selectedTool = ref<Tool>('pen')
const selectedColor = ref('#3B82F6')
const strokeWidth = ref(3)
const opacity = ref(1)

const tools: { id: Tool; icon: string; label: string }[] = [
  { id: 'pen', icon: '✏️', label: 'Bút' },
  { id: 'highlighter', icon: '🖍️', label: 'Bút đánh dấu' },
  { id: 'eraser', icon: '🧽', label: 'Tẩy' },
  { id: 'line', icon: '📏', label: 'Đường thẳng' },
  { id: 'rect', icon: '⬜', label: 'Hình chữ nhật' },
  { id: 'circle', icon: '⭕', label: 'Hình tròn' },
  { id: 'text', icon: '📝', label: 'Chữ' },
]

const colors = [
  '#000000', '#FF0000', '#FF9800', '#FFEB3B', '#4CAF50', 
  '#2196F3', '#3F51B5', '#9C27B0', '#FFFFFF',
]

const strokeWidths = [2, 4, 6, 8, 12]

// Initialize canvas
const initCanvas = () => {
  if (!canvasRef.value || !canvasContainer.value) return
  
  ctx.value = canvasRef.value.getContext('2d')
  if (!ctx.value) return
  
  // Setup canvas size based on container
  const containerRect = canvasContainer.value.getBoundingClientRect()
  scale.value = Math.min(
    containerRect.width / canvasWidth.value,
    containerRect.height / canvasHeight.value
  )
  
  // Set actual canvas size
  canvasRef.value.width = canvasWidth.value
  canvasRef.value.height = canvasHeight.value
  
  // Set canvas background
  ctx.value.fillStyle = '#FFFFFF'
  ctx.value.fillRect(0, 0, canvasWidth.value, canvasHeight.value)
  
  // Redraw all strokes
  redrawCanvas()
}

// Redraw all strokes on canvas
const redrawCanvas = () => {
  if (!ctx.value) return
  
  // Clear and fill background
  ctx.value.fillStyle = '#FFFFFF'
  ctx.value.fillRect(0, 0, canvasWidth.value, canvasHeight.value)
  
  // Draw all strokes
  whiteboardSocket.strokes.value.forEach(stroke => {
    drawStroke(stroke)
  })
  
  // Draw all shapes
  whiteboardSocket.shapes.value.forEach(shape => {
    drawShape(shape)
  })
  
  // Draw all texts
  whiteboardSocket.texts.value.forEach(text => {
    drawText(text)
  })
}

// Draw a single stroke
const drawStroke = (stroke: any) => {
  if (!ctx.value || !stroke.path || stroke.path.length < 2) return
  
  ctx.value.save()
  ctx.value.strokeStyle = stroke.tool === 'eraser' ? '#FFFFFF' : stroke.color
  ctx.value.lineWidth = stroke.strokeWidth
  ctx.value.lineCap = 'round'
  ctx.value.lineJoin = 'round'
  ctx.value.globalAlpha = stroke.opacity || 1
  
  if (stroke.tool === 'highlighter') {
    ctx.value.globalAlpha = 0.3
  }
  
  ctx.value.beginPath()
  ctx.value.moveTo(stroke.path[0].x, stroke.path[0].y)
  
  for (let i = 1; i < stroke.path.length; i++) {
    ctx.value.lineTo(stroke.path[i].x, stroke.path[i].y)
  }
  
  ctx.value.stroke()
  ctx.value.restore()
}

// Draw a shape
const drawShape = (shape: any) => {
  if (!ctx.value) return
  
  ctx.value.save()
  ctx.value.strokeStyle = shape.color
  ctx.value.lineWidth = shape.strokeWidth
  ctx.value.globalAlpha = shape.opacity || 1
  
  const { startPoint, endPoint } = shape
  
  ctx.value.beginPath()
  
  switch (shape.tool) {
    case 'line':
      ctx.value.moveTo(startPoint.x, startPoint.y)
      ctx.value.lineTo(endPoint.x, endPoint.y)
      break
    case 'rect':
      ctx.value.rect(
        startPoint.x, 
        startPoint.y, 
        endPoint.x - startPoint.x, 
        endPoint.y - startPoint.y
      )
      break
    case 'circle':
      const radiusX = Math.abs(endPoint.x - startPoint.x) / 2
      const radiusY = Math.abs(endPoint.y - startPoint.y) / 2
      const centerX = startPoint.x + (endPoint.x - startPoint.x) / 2
      const centerY = startPoint.y + (endPoint.y - startPoint.y) / 2
      ctx.value.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI)
      break
    case 'arrow':
      // Draw line
      ctx.value.moveTo(startPoint.x, startPoint.y)
      ctx.value.lineTo(endPoint.x, endPoint.y)
      
      // Draw arrow head
      const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x)
      const arrowLength = 20
      ctx.value.moveTo(endPoint.x, endPoint.y)
      ctx.value.lineTo(
        endPoint.x - arrowLength * Math.cos(angle - Math.PI / 6),
        endPoint.y - arrowLength * Math.sin(angle - Math.PI / 6)
      )
      ctx.value.moveTo(endPoint.x, endPoint.y)
      ctx.value.lineTo(
        endPoint.x - arrowLength * Math.cos(angle + Math.PI / 6),
        endPoint.y - arrowLength * Math.sin(angle + Math.PI / 6)
      )
      break
  }
  
  ctx.value.stroke()
  
  if (shape.fill) {
    ctx.value.fillStyle = shape.fill
    ctx.value.fill()
  }
  
  ctx.value.restore()
}

// Draw text
const drawText = (text: any) => {
  if (!ctx.value) return
  
  ctx.value.save()
  ctx.value.fillStyle = text.color
  ctx.value.font = `${text.fontSize}px ${text.fontFamily || 'sans-serif'}`
  ctx.value.fillText(text.content, text.position.x, text.position.y)
  ctx.value.restore()
}

// Get canvas coordinates from mouse/touch event
const getCanvasPoint = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
  if (!canvasRef.value) return { x: 0, y: 0 }
  
  const rect = canvasRef.value.getBoundingClientRect()
  let clientX: number, clientY: number
  
  if ('touches' in e && e.touches.length > 0 && e.touches[0]) {
    clientX = e.touches[0].clientX
    clientY = e.touches[0].clientY
  } else if ('clientX' in e) {
    clientX = e.clientX
    clientY = e.clientY
  } else {
    return { x: 0, y: 0 }
  }
  
  return {
    x: (clientX - rect.left) / scale.value,
    y: (clientY - rect.top) / scale.value,
  }
}

// Mouse/Touch handlers
const handlePointerDown = (e: MouseEvent | TouchEvent) => {
  if (!props.canDraw || !ctx.value) return
  
  const point = getCanvasPoint(e)
  
  if (selectedTool.value === 'text') {
    // Handle text input
    const content = prompt('Nhập nội dung:')
    if (content) {
      const textId = generateId()
      whiteboardSocket.addText({
        textId,
        roomId: props.roomId,
        position: point,
        content,
        fontSize: strokeWidth.value * 6,
        color: selectedColor.value,
      })
    }
    return
  }
  
  if (['line', 'rect', 'circle', 'arrow'].includes(selectedTool.value)) {
    // Shape drawing will be handled differently
    isDrawing.value = true
    lastPoint.value = point
    currentStrokeId.value = generateId()
    return
  }
  
  // Start stroke for pen/highlighter/eraser
  isDrawing.value = true
  currentStrokeId.value = generateId()
  lastPoint.value = point
  
  whiteboardSocket.startStroke({
    strokeId: currentStrokeId.value,
    roomId: props.roomId,
    tool: selectedTool.value as 'pen' | 'highlighter' | 'eraser',
    startPoint: { x: point.x, y: point.y, timestamp: Date.now() },
    color: selectedColor.value,
    strokeWidth: strokeWidth.value,
    opacity: selectedTool.value === 'highlighter' ? 0.3 : opacity.value,
  })
}

const handlePointerMove = (e: MouseEvent | TouchEvent) => {
  if (!isDrawing.value || !currentStrokeId.value || !props.canDraw) return
  
  const point = getCanvasPoint(e)
  
  // For shapes, just track the current point
  if (['line', 'rect', 'circle', 'arrow'].includes(selectedTool.value)) {
    // Preview shape on canvas
    redrawCanvas()
    drawShapePreview(lastPoint.value!, point)
    return
  }
  
  // Send points for freehand drawing
  const points = [{ x: point.x, y: point.y, timestamp: Date.now() }]
  
  whiteboardSocket.drawMove({
    strokeId: currentStrokeId.value,
    roomId: props.roomId,
    points,
  })
  
  // Draw locally for immediate feedback
  if (ctx.value && lastPoint.value) {
    ctx.value.save()
    ctx.value.strokeStyle = selectedTool.value === 'eraser' ? '#FFFFFF' : selectedColor.value
    ctx.value.lineWidth = strokeWidth.value
    ctx.value.lineCap = 'round'
    ctx.value.lineJoin = 'round'
    ctx.value.globalAlpha = selectedTool.value === 'highlighter' ? 0.3 : opacity.value
    
    ctx.value.beginPath()
    ctx.value.moveTo(lastPoint.value.x, lastPoint.value.y)
    ctx.value.lineTo(point.x, point.y)
    ctx.value.stroke()
    ctx.value.restore()
  }
  
  lastPoint.value = point
}

const handlePointerUp = (e: MouseEvent | TouchEvent) => {
  if (!isDrawing.value || !currentStrokeId.value) return
  
  const point = getCanvasPoint(e)
  
  // For shapes, emit the shape
  if (['line', 'rect', 'circle', 'arrow'].includes(selectedTool.value) && lastPoint.value) {
    whiteboardSocket.drawShape({
      shapeId: currentStrokeId.value,
      roomId: props.roomId,
      tool: selectedTool.value as 'line' | 'rect' | 'circle' | 'arrow',
      startPoint: { x: lastPoint.value.x, y: lastPoint.value.y },
      endPoint: { x: point.x, y: point.y },
      color: selectedColor.value,
      strokeWidth: strokeWidth.value,
      opacity: opacity.value,
    })
  } else {
    // End stroke for freehand
    whiteboardSocket.endStroke({
      strokeId: currentStrokeId.value,
      roomId: props.roomId,
    })
  }
  
  isDrawing.value = false
  currentStrokeId.value = null
  lastPoint.value = null
}

// Draw shape preview while dragging
const drawShapePreview = (start: { x: number; y: number }, end: { x: number; y: number }) => {
  if (!ctx.value) return
  
  ctx.value.save()
  ctx.value.strokeStyle = selectedColor.value
  ctx.value.lineWidth = strokeWidth.value
  ctx.value.setLineDash([5, 5])
  
  ctx.value.beginPath()
  
  switch (selectedTool.value) {
    case 'line':
      ctx.value.moveTo(start.x, start.y)
      ctx.value.lineTo(end.x, end.y)
      break
    case 'rect':
      ctx.value.rect(start.x, start.y, end.x - start.x, end.y - start.y)
      break
    case 'circle':
      const radiusX = Math.abs(end.x - start.x) / 2
      const radiusY = Math.abs(end.y - start.y) / 2
      const centerX = start.x + (end.x - start.x) / 2
      const centerY = start.y + (end.y - start.y) / 2
      ctx.value.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI)
      break
    case 'arrow':
      ctx.value.moveTo(start.x, start.y)
      ctx.value.lineTo(end.x, end.y)
      break
  }
  
  ctx.value.stroke()
  ctx.value.restore()
}

// Actions
const handleUndo = () => {
  whiteboardSocket.undo(props.roomId)
}

const handleClear = () => {
  if (confirm('Xóa toàn bộ bảng trắng?')) {
    whiteboardSocket.clear(props.roomId)
  }
}

// Setup socket handlers
const setupSocketHandlers = () => {
  whiteboardSocket.onStrokeStart.value = (data) => {
    // Already handled by socket
  }
  
  whiteboardSocket.onStrokeMove.value = (data) => {
    // Redraw affected stroke
    const stroke = whiteboardSocket.strokes.value.get(data.strokeId)
    if (stroke) {
      drawStroke(stroke)
    }
  }
  
  whiteboardSocket.onStrokeEnd.value = (data) => {
    redrawCanvas()
  }
  
  whiteboardSocket.onShapeDrawn.value = (data) => {
    redrawCanvas()
  }
  
  whiteboardSocket.onTextAdded.value = (data) => {
    redrawCanvas()
  }
  
  whiteboardSocket.onStrokeErased.value = () => {
    redrawCanvas()
  }
  
  whiteboardSocket.onUndo.value = () => {
    redrawCanvas()
  }
  
  whiteboardSocket.onClear.value = () => {
    redrawCanvas()
  }
  
  whiteboardSocket.onSyncState.value = () => {
    redrawCanvas()
  }
}

// Lifecycle
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    whiteboardSocket.connect()
    
    // Wait for connection before joining room
    const checkConnection = setInterval(() => {
      if (whiteboardSocket.isConnected.value) {
        clearInterval(checkConnection)
        whiteboardSocket.joinRoom(props.roomId)
        setupSocketHandlers()
        nextTick(() => initCanvas())
      }
    }, 100)
    
    setTimeout(() => clearInterval(checkConnection), 10000)
  } else {
    if (whiteboardSocket.isConnected.value) {
      whiteboardSocket.leaveRoom(props.roomId)
    }
  }
}, { immediate: true })

onMounted(() => {
  if (props.isOpen) {
    whiteboardSocket.connect()
    
    // Wait for connection before joining room and setting up handlers
    const checkConnection = setInterval(() => {
      if (whiteboardSocket.isConnected.value) {
        clearInterval(checkConnection)
        whiteboardSocket.joinRoom(props.roomId)
        setupSocketHandlers()
        nextTick(() => initCanvas())
      }
    }, 100)
    
    setTimeout(() => clearInterval(checkConnection), 10000)
  }
})

onUnmounted(() => {
  whiteboardSocket.disconnect()
})

// Resize handler
const handleResize = () => {
  initCanvas()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isOpen" class="fixed inset-0 z-50 bg-gray-900/95 flex flex-col">
        <!-- Header -->
        <header class="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
          <div class="flex items-center gap-3">
            <span class="text-2xl">🎨</span>
            <h2 class="text-white font-semibold">Bảng trắng</h2>
            <span 
              class="px-2 py-0.5 rounded-full text-xs"
              :class="whiteboardSocket.isConnected.value ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'"
            >
              {{ whiteboardSocket.isConnected.value ? 'Đã kết nối' : 'Đang kết nối...' }}
            </span>
          </div>
          
          <button
            class="w-8 h-8 rounded-lg hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            @click="emit('close')"
          >
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </header>
        
        <!-- Main Content -->
        <div class="flex-1 flex overflow-hidden">
          <!-- Toolbar -->
          <aside class="w-16 bg-gray-800 border-r border-gray-700 py-4 flex flex-col items-center gap-2">
            <!-- Tools -->
            <div class="space-y-1">
              <button
                v-for="tool in tools"
                :key="tool.id"
                class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all"
                :class="selectedTool === tool.id ? 'bg-primary text-white' : 'hover:bg-gray-700'"
                :title="tool.label"
                @click="selectedTool = tool.id"
              >
                {{ tool.icon }}
              </button>
            </div>
            
            <div class="w-10 h-px bg-gray-700 my-2" />
            
            <!-- Colors -->
            <div class="grid grid-cols-3 gap-1">
              <button
                v-for="color in colors"
                :key="color"
                class="w-6 h-6 rounded-full border-2 transition-all"
                :style="{ backgroundColor: color }"
                :class="selectedColor === color ? 'border-white scale-110' : 'border-transparent'"
                @click="selectedColor = color"
              />
            </div>
            
            <div class="w-10 h-px bg-gray-700 my-2" />
            
            <!-- Stroke width -->
            <div class="space-y-1">
              <button
                v-for="width in strokeWidths"
                :key="width"
                class="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
                :class="strokeWidth === width ? 'bg-gray-700' : ''"
                @click="strokeWidth = width"
              >
                <span 
                  class="rounded-full bg-white"
                  :style="{ width: `${width}px`, height: `${width}px` }"
                />
              </button>
            </div>
            
            <div class="flex-1" />
            
            <!-- Actions -->
            <button
              class="w-12 h-12 rounded-xl flex items-center justify-center text-xl hover:bg-gray-700 transition-colors"
              title="Hoàn tác"
              @click="handleUndo"
            >
              ↩️
            </button>
            <button
              class="w-12 h-12 rounded-xl flex items-center justify-center text-xl hover:bg-red-500/20 text-red-400 transition-colors"
              title="Xóa tất cả"
              @click="handleClear"
            >
              🗑️
            </button>
          </aside>
          
          <!-- Canvas Area -->
          <div 
            ref="canvasContainer"
            class="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-900"
          >
            <canvas
              ref="canvasRef"
              class="shadow-2xl cursor-crosshair"
              :style="{
                transform: `scale(${scale})`,
                transformOrigin: 'center',
              }"
              @mousedown="handlePointerDown"
              @mousemove="handlePointerMove"
              @mouseup="handlePointerUp"
              @mouseleave="handlePointerUp"
              @touchstart.prevent="handlePointerDown"
              @touchmove.prevent="handlePointerMove"
              @touchend="handlePointerUp"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
