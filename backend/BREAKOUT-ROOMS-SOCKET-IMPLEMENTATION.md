# Breakout Rooms - Socket & WebRTC Implementation

## ✅ HOÀN THÀNH

### 1. Socket Event Handlers (live-sessions.gateway.ts)

#### State Management
```typescript
// Tracking maps
private activeBreakoutSessions: Map<number, boolean>
private userBreakoutRoom: Map<number, string | null>
private breakoutRoomParticipants: Map<string, Set<number>>
```

#### Socket Events

##### `create-breakout-rooms`
- **Input**: `{ sessionId, rooms[], allowParticipantsToChoose, allowReturnToMain, autoCloseAfterMinutes }`
- **Output**: `{ success, rooms }`
- **Broadcast**: `breakout-rooms-created` → all participants in main room
- **Logic**: 
  - Calls `breakoutRoomsService.createBreakoutRooms()`
  - Broadcasts room list to main room

##### `start-breakout-rooms`
- **Input**: `{ sessionId }`
- **Output**: `{ success, rooms }`
- **Broadcast**: `breakout-rooms-started` → main room
- **Logic**: 
  - Marks session as having active breakouts
  - Opens rooms for joining

##### `join-breakout-room`
- **Input**: `{ sessionId, roomId }`
- **Output**: `{ success, room, participants }`
- **Broadcast**: 
  - `user-joined-breakout` → breakout room
  - `user-moved-to-breakout` → main room
- **Logic**:
  - User leaves main room socket
  - User joins breakout room socket
  - Updates tracking maps
  - Returns list of participants for WebRTC setup

##### `leave-breakout-room`
- **Input**: `{ sessionId }`
- **Output**: `{ success, leftRoom, mainRoomParticipants }`
- **Broadcast**:
  - `user-left-breakout` → breakout room
  - `user-returned-to-main` → main room
- **Logic**:
  - User leaves breakout room socket
  - User rejoins main room socket
  - Returns main room participants for WebRTC reconnection

##### `broadcast-to-breakouts`
- **Input**: `{ sessionId, message }`
- **Output**: `{ success, recipients, rooms }`
- **Broadcast**: `host-broadcast` → all breakout rooms
- **Logic**: 
  - Host sends message to all breakout rooms
  - Useful for announcements

##### `close-all-breakouts`
- **Input**: `{ sessionId }`
- **Output**: `{ success, message }`
- **Broadcast**:
  - `breakout-closing` (10s countdown) → all breakout rooms
  - `breakout-rooms-closed` → main room
- **Logic**:
  - 10-second warning before closing
  - Moves all users back to main room
  - Cleans up all tracking

##### `get-breakout-status`
- **Input**: `{ sessionId }`
- **Output**: `{ success, hasBreakoutRooms, status, rooms, config, remainingMinutes }`
- **Logic**: Returns current breakout session status

##### `get-my-breakout-room`
- **Input**: `{ sessionId }`
- **Output**: `{ success, inBreakoutRoom, room }`
- **Logic**: Returns which breakout room user is currently in

---

### 2. WebRTC Signaling Enhancements

#### Room Isolation
Modified `handleSignal()` to enforce room isolation:

```typescript
// Check if both users are in same room context
const fromBreakoutRoom = this.userBreakoutRoom.get(fromUserId);
const targetBreakoutRoom = this.userBreakoutRoom.get(targetUserId);

if (fromBreakoutRoom !== targetBreakoutRoom) {
  return { success: false, error: 'Cannot signal to user in different room' };
}
```

**Behavior**:
- Users in **main room** can only signal to other main room users
- Users in **breakout room A** can only signal to other users in breakout room A
- Cross-room signaling is blocked

#### Cleanup on Disconnect
Enhanced `handleDisconnect()`:

```typescript
// Cleanup breakout room tracking
const breakoutRoom = this.userBreakoutRoom.get(userId);
if (breakoutRoom) {
  const participants = this.breakoutRoomParticipants.get(breakoutRoom);
  if (participants) {
    participants.delete(userId);
    this.server.to(breakoutRoom).emit('user-left-breakout', { userId, roomId: breakoutRoom });
  }
  this.userBreakoutRoom.delete(userId);
}
```

---

### 3. WebRTC Flow for Breakout Rooms

#### Join Breakout Room Flow
```
1. Client → Server: join-breakout-room
2. Server: Update socket rooms (leave main, join breakout)
3. Server → Client: { success: true, participants: [...] }
4. Client: Close all existing peer connections
5. Client: Create new peer connections with breakout participants
6. WebRTC signaling happens within breakout room context only
```

#### Leave Breakout Room Flow
```
1. Client → Server: leave-breakout-room
2. Server: Update socket rooms (leave breakout, join main)
3. Server → Client: { success: true, mainRoomParticipants: [...] }
4. Client: Close all breakout peer connections
5. Client: Create new peer connections with main room participants
6. WebRTC signaling happens within main room context only
```

#### Close All Breakouts Flow
```
1. Host → Server: close-all-breakouts
2. Server → All Breakouts: breakout-closing (10s countdown)
3. [Wait 10 seconds]
4. Server: Move all users to main room sockets
5. Server → Main Room: breakout-rooms-closed
6. Clients: Close breakout connections, reconnect in main room
```

---

## 🔌 Socket Events Summary

| Event | Direction | Purpose |
|-------|-----------|---------|
| `create-breakout-rooms` | Client → Server | Create breakout rooms |
| `breakout-rooms-created` | Server → Clients | Notify rooms created |
| `start-breakout-rooms` | Client → Server | Open rooms for joining |
| `breakout-rooms-started` | Server → Clients | Notify rooms opened |
| `join-breakout-room` | Client → Server | Join a breakout room |
| `user-joined-breakout` | Server → Breakout | User joined this room |
| `user-moved-to-breakout` | Server → Main | User moved to breakout |
| `leave-breakout-room` | Client → Server | Return to main room |
| `user-left-breakout` | Server → Breakout | User left this room |
| `user-returned-to-main` | Server → Main | User returned from breakout |
| `broadcast-to-breakouts` | Client → Server | Host message to all |
| `host-broadcast` | Server → Breakouts | Host announcement |
| `close-all-breakouts` | Client → Server | Close all rooms |
| `breakout-closing` | Server → Breakouts | 10s countdown warning |
| `breakout-rooms-closed` | Server → Main | Rooms closed |
| `get-breakout-status` | Client → Server | Query status |
| `get-my-breakout-room` | Client → Server | Query my room |

---

## 📊 Architecture

### Main Room vs Breakout Room

```
Session 123 (Main Room)
├── socket-room-id: "session-123"
├── Participants in main:
│   ├── Teacher (always in main)
│   ├── Student A (in main)
│   └── Student D (in main)
│
└── Breakout Rooms:
    ├── "123-breakout-1"
    │   ├── Student B
    │   └── Student C
    │
    └── "123-breakout-2"
        ├── Student E
        └── Student F
```

### WebRTC Mesh per Room

**Main Room**: Teacher ↔ Student A ↔ Student D (full mesh)

**Breakout 1**: Student B ↔ Student C (isolated mesh)

**Breakout 2**: Student E ↔ Student F (isolated mesh)

---

## 🎯 Next Steps: Frontend Implementation

### 1. Create Composable: `useBreakoutRooms.ts`

```typescript
export function useBreakoutRooms() {
  const socket = useLiveSocket()
  
  const createBreakoutRooms = (sessionId, config) => {
    return socket.emit('create-breakout-rooms', { sessionId, ...config })
  }
  
  const joinBreakoutRoom = (sessionId, roomId) => {
    return socket.emit('join-breakout-room', { sessionId, roomId })
  }
  
  // ... other methods
  
  return {
    createBreakoutRooms,
    joinBreakoutRoom,
    leaveBreakoutRoom,
    closeAllBreakouts,
    // ... state
  }
}
```

### 2. Update `useLiveSocket.ts`

Add event listeners:
- `breakout-rooms-created`
- `breakout-rooms-started`
- `user-joined-breakout`
- `user-left-breakout`
- `breakout-closing`
- `breakout-rooms-closed`
- `host-broadcast`

### 3. Create Component: `BreakoutRoomManager.vue`

UI for teacher:
- Create rooms (name, auto-assign)
- Start rooms
- View participants per room
- Broadcast message
- Close all rooms

### 4. Create Component: `BreakoutRoomPanel.vue`

UI for students:
- Show available rooms (if choice allowed)
- Join room button
- Leave room button
- Show current room members

### 5. Update `[id].vue` (Live Session Page)

Add handlers for room switching:
```typescript
const handleBreakoutRoomJoin = async (participants) => {
  // Close all existing peer connections
  closeAllPeerConnections()
  
  // Setup WebRTC with new breakout participants
  await setupWebRTCWithParticipants(participants)
}

const handleReturnToMain = async (mainParticipants) => {
  // Close breakout connections
  closeAllPeerConnections()
  
  // Reconnect in main room
  await setupWebRTCWithParticipants(mainParticipants)
}
```

---

## ⚠️ Important Notes

### 1. Teacher Position
- Teacher **stays in main room** at all times
- Teacher can **broadcast** to all breakouts but **cannot join** video/audio in breakouts
- This keeps architecture simple and avoids complex WebRTC migrations

### 2. WebRTC Cleanup
- **Always close peer connections** when switching rooms
- Prevent memory leaks by properly disposing streams
- Clean up event listeners

### 3. State Synchronization
- Backend is source of truth for room membership
- Frontend must handle async nature of room switching
- Show loading states during transitions

### 4. Auto-Close Timer
- 10-second warning before closing
- Give users time to save work or finish discussions
- Automatic socket room migration handled by backend

---

## 🧪 Testing Checklist

- [ ] Create breakout rooms (REST + Socket)
- [ ] Start breakout rooms
- [ ] Student joins breakout room
- [ ] WebRTC works within breakout room
- [ ] Student leaves back to main
- [ ] WebRTC reconnects in main room
- [ ] Cross-room signaling is blocked
- [ ] Host broadcasts message
- [ ] Auto-close timer works
- [ ] Manual close works
- [ ] Cleanup on disconnect
- [ ] Multiple sessions with breakouts
- [ ] Edge case: User disconnects during room switch

---

## 📝 Implementation Status

- ✅ Backend Service Layer (breakout-rooms.service.ts)
- ✅ REST API Endpoints (live-sessions.controller.ts)
- ✅ Socket Event Handlers (live-sessions.gateway.ts)
- ✅ WebRTC Room Isolation
- ✅ State Management & Tracking
- ✅ Cleanup & Disconnect Handling
- ❌ Frontend Composable
- ❌ Frontend Components
- ❌ UI/UX Implementation
- ❌ End-to-End Testing

**Backend: 100% Complete** ✅
**Frontend: 0% Complete** ⏳
