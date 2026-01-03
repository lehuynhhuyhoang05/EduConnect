import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { WebRTCService } from '../services/webrtc.service';
import VideoPlayer from '../components/VideoPlayer';

// Config
const API_URL = 'http://localhost:3000';
const WS_URL = 'http://localhost:3000/live';

interface Participant {
  userId: number;
  socketId: string;
  userName?: string;
  mediaState?: MediaState;
}

interface WaitingUser {
  userId: number;
  userName?: string;
  socketId: string;
  requestedAt: string;
}

interface RaisedHand {
  userId: number;
  raisedAt: string;
  order: number;
}

interface MediaState {
  audio: boolean;
  video: boolean;
  screen: boolean;
}

interface LogEntry {
  id: number;
  time: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'event';
}

export default function LiveSessionDemo() {
  // Auth state
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Socket state
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  // Room state
  const [roomId, setRoomId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [inRoom, setInRoom] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);

  // Participants
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [waitingUsers, setWaitingUsers] = useState<WaitingUser[]>([]);
  const [raisedHands, setRaisedHands] = useState<RaisedHand[]>([]);
  const [participantsMedia, setParticipantsMedia] = useState<Map<number, MediaState>>(new Map());

  // Media state
  const [myMediaState, setMyMediaState] = useState<MediaState>({ audio: true, video: true, screen: false });

  // WebRTC state
  const [webrtc, setWebrtc] = useState<WebRTCService | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<number, MediaStream>>(new Map());

  // Waiting room
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(false);

  // Hand raised
  const [handRaised, setHandRaised] = useState(false);

  // Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logIdRef = useRef(0);

  // Chat
  const [chatMessage, setChatMessage] = useState('');

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const timestamp = new Date().toLocaleTimeString('vi-VN');
    logIdRef.current += 1;
    setLogs(prev => [...prev.slice(-100), { id: logIdRef.current, time: timestamp, message, type }]);
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // ===================== AUTH =====================

  const handleLogin = async () => {
    // Validation
    setError('');
    if (!email.trim()) {
      setError('Vui lòng nhập email');
      return;
    }
    if (!password.trim()) {
      setError('Vui lòng nhập mật khẩu');
      return;
    }
    if (!email.includes('@')) {
      setError('Email không hợp lệ');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        const errorMsg = data.message || response.statusText;
        setError(errorMsg);
        addLog(`Đăng nhập thất bại: ${errorMsg}`, 'error');
        return;
      }
      
      if (data.tokens?.accessToken) {
        setToken(data.tokens.accessToken);
        setUserId(data.user?.id);
        setUserName(data.user?.fullName || data.user?.email?.split('@')[0] || 'User');
        setIsLoggedIn(true);
        setError('');
        addLog(`Đăng nhập thành công! ID: ${data.user?.id}`, 'success');
      } else {
        setError('Không nhận được token từ server');
        addLog(`Đăng nhập thất bại: Không nhận được token`, 'error');
      }
    } catch (error: any) {
      const errorMsg = `Lỗi kết nối: ${error.message}`;
      setError(errorMsg);
      addLog(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ===================== SOCKET CONNECTION =====================

  const connectSocket = () => {
    if (!token) {
      addLog('Chưa có token!', 'error');
      return;
    }

    const newSocket = io(WS_URL, { auth: { token }, transports: ['websocket'] });

    newSocket.on('connect', () => { setConnected(true); addLog('Socket đã kết nối!', 'success'); });
    newSocket.on('disconnect', () => { setConnected(false); addLog('Socket đã ngắt!', 'error'); });
    newSocket.on('connected', (data) => { addLog(`Authenticated: userId=${data.userId}`, 'success'); });

    newSocket.on('user-joined', (data) => {
      addLog(`${data.userName || 'User ' + data.userId} đã tham gia`, 'event');
      setParticipants(prev => [...prev, { userId: data.userId, socketId: data.socketId, userName: data.userName }]);
      
      // Connect WebRTC to new user (with delay to ensure they're ready)
      if (webrtc && data.userId !== userId) {
        setTimeout(() => {
          addLog(`🔗 Connecting WebRTC to User ${data.userId}...`, 'info');
          webrtc.connectToPeer(data.userId);
        }, 1000);
      }
    });

    newSocket.on('media-state-updated', (data) => {
      addLog(`📡 ${data.userName || 'User ' + data.userId}: 🎤${data.audio ? 'ON' : 'OFF'} 📹${data.video ? 'ON' : 'OFF'} 🖥️${data.screen ? 'ON' : 'OFF'}`, 'info');
      setParticipantsMedia(prev => new Map(prev).set(data.userId, { audio: data.audio, video: data.video, screen: data.screen }));
    });

    newSocket.on('user-left', (data) => {
      addLog(`User ${data.userId} đã rời phòng`, 'event');
      setParticipants(prev => prev.filter(p => p.userId !== data.userId));
    });

    newSocket.on('user-waiting', (data) => {
      addLog(`${data.userName || 'User ' + data.userId} đang chờ`, 'warning');
      setWaitingUsers(prev => [...prev, data]);
    });

    newSocket.on('admission-granted', () => { addLog('Đã được chấp nhận!', 'success'); setIsWaiting(false); setInRoom(true); });
    newSocket.on('admission-denied', (data) => { addLog(`Bị từ chối: ${data.reason}`, 'error'); setIsWaiting(false); });
    newSocket.on('room-joined', (data) => { setParticipants(data.participants || []); });
    newSocket.on('waiting-room-status', (data) => { setWaitingRoomEnabled(data.enabled); });

    newSocket.on('hand-raised', (data) => {
      addLog(`User ${data.userId} giơ tay (#${data.order})`, 'event');
      setRaisedHands(prev => [...prev, data]);
    });

    newSocket.on('hand-lowered', (data) => {
      setRaisedHands(prev => prev.filter(h => h.userId !== data.userId));
      if (data.userId === userId) setHandRaised(false);
    });

    newSocket.on('force-mute', (data) => {
      addLog(`Host ${data.mute ? 'mute' : 'unmute'} bạn`, 'warning');
      setMyMediaState(prev => ({ ...prev, audio: !data.mute }));
    });

    newSocket.on('force-disable-camera', (data) => {
      addLog(`Host ${data.disable ? 'tắt' : 'bật'} camera`, 'warning');
      setMyMediaState(prev => ({ ...prev, video: !data.disable }));
    });

    newSocket.on('kicked', (data) => { addLog(`Bị kick: ${data.reason}`, 'error'); setInRoom(false); });
    newSocket.on('participant-kicked', (data) => { setParticipants(prev => prev.filter(p => p.userId !== data.userId)); });
    newSocket.on('session-ended', (data) => { addLog(`Phiên kết thúc: ${data.message}`, 'warning'); setInRoom(false); setParticipants([]); });
    newSocket.on('chat-message', (data) => { addLog(`💬 User ${data.userId}: ${data.message}`, 'info'); });

    setSocket(newSocket);
  };

  const disconnectSocket = () => {
    socket?.disconnect();
    setSocket(null);
    setConnected(false);
    setInRoom(false);
  };

  // ===================== ROOM ACTIONS =====================

  const joinRoom = async () => {
    if (!socket || !roomId || !sessionId) { addLog('Thiếu thông tin phòng!', 'error'); return; }
    
    socket.emit('join-room', { roomId, sessionId: parseInt(sessionId), userName: userName || `User-${userId}` }, async (response: any) => {
      if (response.success) {
        if (response.waiting) { 
          setIsWaiting(true); 
          addLog('Đang chờ host...', 'warning'); 
        } else { 
          setInRoom(true); 
          setParticipants(response.participants || []); 
          addLog('Đã vào phòng!', 'success');

          // Initialize WebRTC
          if (userId && socket) {
            try {
              addLog('🎥 Đang khởi tạo WebRTC...', 'info');
              const webrtcService = new WebRTCService(socket, roomId, userId);
              
              // Setup callbacks
              webrtcService.onLocalStream((stream) => {
                setLocalStream(stream);
                addLog('📹 Camera/mic đã sẵn sàng!', 'success');
              });

              webrtcService.onScreenStream((stream) => {
                setScreenStream(stream);
                if (stream) {
                  addLog('🖥️ Screen share stream sẵn sàng!', 'success');
                } else {
                  setMyMediaState(p => ({ ...p, screen: false }));
                  addLog('🖥️ Đã dừng chia sẻ màn hình', 'warning');
                }
              });

              webrtcService.onRemoteStream((remoteUserId, stream) => {
                setRemoteStreams(prev => new Map(prev).set(remoteUserId, stream));
                addLog(`📹 Nhận video từ User ${remoteUserId}`, 'success');
              });

              webrtcService.onRemoveStream((remoteUserId) => {
                setRemoteStreams(prev => {
                  const newMap = new Map(prev);
                  newMap.delete(remoteUserId);
                  return newMap;
                });
                addLog(`📹 User ${remoteUserId} ngắt kết nối`, 'warning');
              });

              webrtcService.onError((error) => {
                addLog(`❌ WebRTC Error: ${error.message}`, 'error');
              });

              // Start local camera/mic (with fallbacks)
              try {
                await webrtcService.startLocalStream(true, true);
              } catch (err: any) {
                addLog(`⚠️ Không thể bật camera/mic: ${err.message}`, 'warning');
                
                // Try audio only
                try {
                  addLog('🔄 Thử chỉ bật audio...', 'info');
                  await webrtcService.startLocalStream(true, false);
                  addLog('✅ Chỉ có audio (không có video)', 'success');
                } catch (audioErr: any) {
                  addLog(`⚠️ Không thể bật audio: ${audioErr.message}`, 'warning');
                  addLog('💡 Bạn có thể vào phòng nhưng không có media', 'info');
                  addLog('💡 Kiểm tra: 1) Camera đang mở bởi app khác? 2) Browser có quyền?', 'info');
                }
              }

              // Connect to existing participants
              if (response.participants && response.participants.length > 0) {
                addLog(`🔗 Kết nối với ${response.participants.length} người...`, 'info');
                response.participants.forEach((p: any) => {
                  if (p.userId !== userId) {
                    setTimeout(() => {
                      webrtcService.connectToPeer(p.userId);
                    }, 1500);
                  }
                });
              }

              setWebrtc(webrtcService);
            } catch (err: any) {
              addLog(`❌ Lỗi khởi tạo WebRTC: ${err.message}`, 'error');
            }
          }
        }
      } else { 
        addLog(`Lỗi: ${response.error}`, 'error'); 
      }
    });
  };

  const leaveRoom = () => { 
    // Cleanup WebRTC
    if (webrtc) {
      webrtc.closeAllConnections();
      setWebrtc(null);
      addLog('🔌 WebRTC đã đóng', 'info');
    }
    setLocalStream(null);
    setRemoteStreams(new Map());

    socket?.emit('leave-room', { roomId }, () => { 
      setInRoom(false); 
      setParticipants([]); 
    }); 
  };

  // ===================== FEATURES =====================

  const raiseHand = () => { socket?.emit('raise-hand', { roomId }, (r: any) => { if (r.success) setHandRaised(true); }); };
  const lowerHand = (t?: number) => { socket?.emit('lower-hand', { roomId, targetUserId: t }, () => { if (!t || t === userId) setHandRaised(false); }); };

  const muteAll = (m: boolean) => { socket?.emit('mute-all', { roomId, mute: m, exceptHost: true }, (r: any) => { addLog(`${m ? 'Mute' : 'Unmute'} ${r.affectedCount} người`, 'success'); }); };
  const disableAllCameras = (d: boolean) => { socket?.emit('disable-all-cameras', { roomId, disable: d, exceptHost: true }); };
  const muteParticipant = (t: number, m: boolean) => { socket?.emit('mute-participant', { roomId, targetUserId: t, mute: m }); };
  const disableCamera = (t: number, d: boolean) => { socket?.emit('disable-camera', { roomId, targetUserId: t, disable: d }); };
  const kickParticipant = (t: number) => { socket?.emit('kick-participant', { roomId, targetUserId: t, sessionId: parseInt(sessionId) }); };
  const endSession = () => { if (confirm('Kết thúc phiên?')) socket?.emit('end-session', { roomId, sessionId: parseInt(sessionId) }); };

  const toggleWaitingRoom = (e: boolean) => { socket?.emit('enable-waiting-room', { roomId, enabled: e }, () => setWaitingRoomEnabled(e)); };
  const admitUser = (t: number) => { socket?.emit('admit-user', { roomId, targetUserId: t }, () => setWaitingUsers(prev => prev.filter(u => u.userId !== t))); };
  const admitAllUsers = () => { socket?.emit('admit-all-users', { roomId }, () => setWaitingUsers([])); };
  const denyUser = (t: number) => { socket?.emit('deny-user', { roomId, targetUserId: t, reason: 'Từ chối' }, () => setWaitingUsers(prev => prev.filter(u => u.userId !== t))); };

  const toggleAudio = () => { 
    const n = !myMediaState.audio; 
    setMyMediaState(p => ({ ...p, audio: n }));
    
    // Toggle WebRTC audio track
    if (webrtc) {
      webrtc.toggleAudio(n);
    }
    
    socket?.emit('media-state', { roomId, audio: n, video: myMediaState.video, screen: myMediaState.screen });
    addLog(`🎤 Mic: ${n ? 'BẬT' : 'TẮT'}`, n ? 'success' : 'warning');
  };
  
  const toggleVideo = () => { 
    const n = !myMediaState.video; 
    setMyMediaState(p => ({ ...p, video: n }));
    
    // Toggle WebRTC video track
    if (webrtc) {
      webrtc.toggleVideo(n);
    }
    
    socket?.emit('media-state', { roomId, audio: myMediaState.audio, video: n, screen: myMediaState.screen });
    addLog(`📹 Camera: ${n ? 'BẬT' : 'TẮT'}`, n ? 'success' : 'warning');
  };
  
  const toggleScreenShare = async () => {
    const n = !myMediaState.screen;
    
    if (webrtc) {
      if (n) {
        // Start screen share
        try {
          await webrtc.replaceWithScreenShare();
          socket?.emit('screen-share-start', { roomId });
          setMyMediaState(p => ({ ...p, screen: true }));
          addLog('🖥️ Chia sẻ màn hình: BẬT', 'success');
        } catch (err: any) {
          addLog(`⚠️ Lỗi chia sẻ màn hình: ${err.message}`, 'error');
          return;
        }
      } else {
        // Stop screen share
        await webrtc.replaceWithCamera();
        socket?.emit('screen-share-stop', { roomId });
        setMyMediaState(p => ({ ...p, screen: false }));
        addLog('🖥️ Chia sẻ màn hình: TẮT', 'warning');
      }
    }

    socket?.emit('media-state', { 
      roomId, 
      audio: myMediaState.audio, 
      video: myMediaState.video, 
      screen: n 
    });
  };

  const sendChat = () => { if (chatMessage.trim()) { socket?.emit('chat-message', { roomId, message: chatMessage, type: 'text' }); setChatMessage(''); } };

  const logColor = (t: LogEntry['type']) => {
    const colors = { success: 'text-emerald-400', error: 'text-red-400', warning: 'text-amber-400', event: 'text-purple-400', info: 'text-slate-300' };
    return colors[t];
  };

  // ===================== CLEANUP =====================
  
  useEffect(() => {
    return () => {
      if (webrtc) {
        webrtc.closeAllConnections();
      }
    };
  }, [webrtc]);

  // ===================== RENDER =====================

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4 shadow-xl transform hover:scale-105 transition-transform">
              <span className="text-4xl">🎓</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">EduConnect Live</h1>
            <p className="text-slate-400">Hệ thống học trực tuyến thời gian thực</p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/20">
            <div className="space-y-4">
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl flex items-start gap-2 animate-shake">
                  <span className="text-xl">⚠️</span>
                  <span className="text-sm flex-1">{error}</span>
                </div>
              )}
              <div>
                <label className="text-slate-300 text-sm font-medium mb-2 block">Email</label>
                <input 
                  type="email" 
                  placeholder="example@gmail.com" 
                  value={email} 
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  disabled={isLoading}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition disabled:opacity-50" 
                />
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium mb-2 block">Mật khẩu</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleLogin()}
                  disabled={isLoading}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition disabled:opacity-50" 
                />
              </div>
              <button 
                onClick={handleLogin} 
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    <span>Đang đăng nhập...</span>
                  </>
                ) : (
                  <span>🚀 Đăng nhập</span>
                )}
              </button>
              <div className="pt-4 border-t border-white/10">
                <p className="text-slate-400 text-xs text-center">💡 Tài khoản test:</p>
                <div className="mt-2 space-y-1">
                  <p className="text-slate-500 text-xs text-center font-mono">teacher@test.com / 123456</p>
                  <p className="text-slate-500 text-xs text-center font-mono">student1@test.com / 123456</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 rounded-full mb-4 animate-bounce">
              <span className="text-3xl">✅</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Xin chào, {userName}!</h1>
            <p className="text-slate-400">User ID: <span className="font-mono text-emerald-400">{userId}</span></p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/20 space-y-5">
            <div>
              <label className="text-slate-300 text-sm font-medium mb-2 block flex items-center gap-2">
                <span>🏠</span> Room ID
              </label>
              <input 
                placeholder="VD: test-room-001 hoặc UUID" 
                value={roomId} 
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm" 
              />
              <p className="text-slate-500 text-xs mt-1">Nhập cùng Room ID để vào chung phòng</p>
            </div>
            <div>
              <label className="text-slate-300 text-sm font-medium mb-2 block flex items-center gap-2">
                <span>🔢</span> Session ID
              </label>
              <input 
                placeholder="VD: 1, 2, 3..." 
                type="number"
                value={sessionId} 
                onChange={(e) => setSessionId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500" 
              />
              <p className="text-slate-500 text-xs mt-1">Phải là số nguyên dương</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={isHost} 
                  onChange={(e) => setIsHost(e.target.checked)} 
                  className="w-5 h-5 rounded mt-0.5" 
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">Tôi là Host (Giáo viên)</span>
                    {isHost && <span className="text-xs bg-amber-500 text-white px-2 py-1 rounded-full animate-pulse">👑 Host</span>}
                  </div>
                  <p className="text-slate-400 text-xs mt-1">Host có quyền kiểm soát phòng học</p>
                </div>
              </label>
            </div>
            <button 
              onClick={connectSocket} 
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-600 transition shadow-lg transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2">
              <span className="text-xl">📡</span>
              <span>Kết nối Socket</span>
            </button>
            <button 
              onClick={() => { setIsLoggedIn(false); setToken(''); setError(''); }} 
              className="w-full py-2 text-slate-400 hover:text-white transition text-sm flex items-center justify-center gap-2">
              <span>←</span> Đăng xuất
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-2xl">🎓</span>
            <span className="font-bold text-white hidden sm:block">EduConnect Live</span>
            {inRoom && (
              <div className="flex items-center gap-2 bg-emerald-500/20 px-3 py-1 rounded-full">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-emerald-400 text-sm">Đang trong phòng</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm hidden md:block">👤 {userName} {isHost && '(Host)'}</span>
            <button onClick={disconnectSocket} className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30">Ngắt kết nối</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        {/* Join Room */}
        {!inRoom && !isWaiting && (
          <div className="max-w-md mx-auto mt-8 bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 space-y-4">
            <h2 className="text-xl font-semibold text-white text-center">Vào phòng học</h2>
            <input placeholder="Room ID" value={roomId} onChange={(e) => setRoomId(e.target.value)} className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            <input placeholder="Session ID" value={sessionId} onChange={(e) => setSessionId(e.target.value)} className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
            <button onClick={joinRoom} className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl">🚀 Vào phòng</button>
          </div>
        )}

        {isWaiting && (
          <div className="max-w-md mx-auto mt-8 bg-amber-500/10 backdrop-blur-xl rounded-2xl p-8 border border-amber-500/30 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500/20 rounded-full mb-4 animate-pulse">
              <span className="text-4xl">⏳</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Đang chờ được chấp nhận</h2>
            <p className="text-slate-400">Host sẽ cho bạn vào phòng...</p>
          </div>
        )}

        {/* Main UI - In Room */}
        {inRoom && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
            {/* Left: Media Controls */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                <h3 className="text-sm font-medium text-slate-400 mb-3">Media</h3>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={toggleAudio} className={`flex flex-col items-center gap-1 p-3 rounded-xl ${myMediaState.audio ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    <span className="text-2xl">{myMediaState.audio ? '🎤' : '🔇'}</span><span className="text-xs">Mic</span>
                  </button>
                  <button onClick={toggleVideo} className={`flex flex-col items-center gap-1 p-3 rounded-xl ${myMediaState.video ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    <span className="text-2xl">{myMediaState.video ? '📹' : '📷'}</span><span className="text-xs">Cam</span>
                  </button>
                  <button onClick={toggleScreenShare} className={`flex flex-col items-center gap-1 p-3 rounded-xl ${myMediaState.screen ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'}`}>
                    <span className="text-2xl">🖥️</span><span className="text-xs">Share</span>
                  </button>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                <h3 className="text-sm font-medium text-slate-400 mb-3">Giơ tay</h3>
                <button onClick={handRaised ? () => lowerHand() : raiseHand}
                  className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${handRaised ? 'bg-amber-500 text-white' : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'}`}>
                  <span className="text-xl">{handRaised ? '👋' : '✋'}</span>{handRaised ? 'Hạ tay' : 'Giơ tay'}
                </button>
                {raisedHands.length > 0 && <div className="mt-3 text-sm text-amber-400">{raisedHands.length} người đang giơ tay</div>}
              </div>

              <button onClick={leaveRoom} className="w-full py-3 bg-red-500/20 text-red-400 rounded-xl font-medium hover:bg-red-500/30 flex items-center justify-center gap-2">
                🚪 Rời phòng
              </button>
            </div>

            {/* Center: Video Grid & Host Controls */}
            <div className="lg:col-span-6 space-y-4">
              
              {/* Screen Share Banner (when sharing) */}
              {myMediaState.screen && (
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-4 border border-blue-400/50 shadow-lg shadow-blue-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="animate-pulse">
                        <div className="w-4 h-4 bg-red-500 rounded-full shadow-lg shadow-red-500/50"></div>
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg">🖥️ Đang chia sẻ màn hình</h3>
                        <p className="text-blue-100 text-sm">Người khác đang nhìn thấy màn hình của bạn</p>
                      </div>
                    </div>
                    <button 
                      onClick={toggleScreenShare} 
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
                    >
                      Dừng chia sẻ
                    </button>
                  </div>
                </div>
              )}

              {/* Screen Share Preview (when sharing) */}
              {screenStream && (
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-blue-500/30">
                  <h3 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
                    🖥️ Xem trước màn hình đang chia sẻ
                  </h3>
                  <div className="relative aspect-video bg-black rounded-xl overflow-hidden border-2 border-blue-500/50">
                    <video
                      autoPlay
                      playsInline
                      muted
                      ref={(video) => {
                        if (video && screenStream) {
                          video.srcObject = screenStream;
                        }
                      }}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute bottom-2 left-2 bg-blue-500/80 px-2 py-1 rounded text-xs text-white">
                      Screen Preview
                    </div>
                  </div>
                </div>
              )}

              {/* Media Status Summary */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                <h3 className="text-sm font-medium text-slate-400 mb-3">📊 Trạng thái Media của bạn</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className={`p-3 rounded-xl text-center ${myMediaState.audio ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
                    <div className="text-2xl mb-1">{myMediaState.audio ? '🎤' : '🔇'}</div>
                    <div className={`text-sm font-medium ${myMediaState.audio ? 'text-emerald-400' : 'text-red-400'}`}>
                      Mic {myMediaState.audio ? 'BẬT' : 'TẮT'}
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl text-center ${myMediaState.video ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-slate-500/20 border border-slate-500/30'}`}>
                    <div className="text-2xl mb-1">{myMediaState.video ? '📹' : '📷'}</div>
                    <div className={`text-sm font-medium ${myMediaState.video ? 'text-emerald-400' : 'text-slate-400'}`}>
                      Camera {myMediaState.video ? 'BẬT' : 'TẮT'}
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl text-center ${myMediaState.screen ? 'bg-blue-500/20 border border-blue-500/30 animate-pulse' : 'bg-slate-500/20 border border-slate-500/30'}`}>
                    <div className="text-2xl mb-1">🖥️</div>
                    <div className={`text-sm font-medium ${myMediaState.screen ? 'text-blue-400' : 'text-slate-400'}`}>
                      Screen {myMediaState.screen ? 'BẬT' : 'TẮT'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Video Streams */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                <h3 className="text-sm font-medium text-slate-400 mb-3">📹 Video Streams</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Local video/audio indicator */}
                  {localStream && (
                    <VideoPlayer
                      stream={localStream}
                      muted={true}
                      mirrored={true}
                      userName={userName}
                      isLocal={true}
                      audioEnabled={myMediaState.audio}
                      videoEnabled={myMediaState.video}
                    />
                  )}

                  {/* Audio-only indicator when no video but has audio */}
                  {!localStream && myMediaState.audio && (
                    <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-800/30 rounded-xl p-6 text-center border border-emerald-500/30">
                      <div className="text-5xl mb-3 animate-pulse">🎤</div>
                      <p className="text-emerald-400 font-medium">{userName} (Bạn)</p>
                      <p className="text-emerald-300 text-sm mt-1">Chỉ có Audio</p>
                      <div className="mt-3 flex items-center justify-center gap-2">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                        <span className="text-emerald-400 text-xs">Đang phát audio</span>
                      </div>
                    </div>
                  )}

                  {/* Remote videos */}
                  {Array.from(remoteStreams.entries()).map(([remoteUserId, stream]) => {
                    const participant = participants.find(p => p.userId === remoteUserId);
                    const media = participantsMedia.get(remoteUserId) || { audio: true, video: true, screen: false };
                    
                    return (
                      <VideoPlayer
                        key={remoteUserId}
                        stream={stream}
                        muted={false}
                        userName={participant?.userName || `User ${remoteUserId}`}
                        isLocal={false}
                        audioEnabled={media.audio}
                        videoEnabled={media.video}
                      />
                    );
                  })}
                  
                  {/* Placeholder when no streams at all */}
                  {!localStream && !myMediaState.audio && remoteStreams.size === 0 && (
                    <div className="col-span-full bg-slate-800/50 rounded-xl p-8 text-center border border-slate-600/30">
                      <div className="text-6xl mb-4">🎥</div>
                      <p className="text-slate-400 font-medium">Chờ khởi động camera/mic...</p>
                      <p className="text-slate-500 text-sm mt-2">Cho phép quyền truy cập trong browser</p>
                      <div className="mt-4 text-xs text-slate-600">
                        Nếu không có camera, bạn vẫn có thể dùng mic hoặc chia sẻ màn hình
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {isHost && (
                <>
                  <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 backdrop-blur-xl rounded-2xl p-4 border border-amber-500/20">
                    <h3 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">👑 Host Controls</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button onClick={() => muteAll(true)} className="p-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 text-sm">🔇 Mute All</button>
                      <button onClick={() => muteAll(false)} className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30 text-sm">🔊 Unmute</button>
                      <button onClick={() => disableAllCameras(true)} className="p-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 text-sm">📷❌ Cam Off</button>
                      <button onClick={() => disableAllCameras(false)} className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30 text-sm">📷✅ Cam On</button>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => toggleWaitingRoom(!waitingRoomEnabled)} className={`flex-1 py-2 rounded-xl text-sm ${waitingRoomEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                        🚪 Waiting: {waitingRoomEnabled ? 'ON' : 'OFF'}
                      </button>
                      <button onClick={endSession} className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm">🔴 End</button>
                    </div>
                  </div>

                  {waitingUsers.length > 0 && (
                    <div className="bg-amber-500/10 backdrop-blur-xl rounded-2xl p-4 border border-amber-500/20">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-amber-400">⏳ Chờ ({waitingUsers.length})</h3>
                        <button onClick={admitAllUsers} className="text-xs bg-emerald-500 text-white px-3 py-1 rounded-full">Cho vào hết</button>
                      </div>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {waitingUsers.map(u => (
                          <div key={u.userId} className="flex items-center justify-between bg-white/5 p-2 rounded-lg">
                            <span className="text-white text-sm">{u.userName || `User ${u.userId}`}</span>
                            <div className="flex gap-1">
                              <button onClick={() => admitUser(u.userId)} className="w-7 h-7 bg-emerald-500 text-white rounded-lg text-xs">✓</button>
                              <button onClick={() => denyUser(u.userId)} className="w-7 h-7 bg-red-500 text-white rounded-lg text-xs">✕</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {raisedHands.length > 0 && (
                    <div className="bg-amber-500/10 backdrop-blur-xl rounded-2xl p-4 border border-amber-500/20">
                      <h3 className="text-sm font-medium text-amber-400 mb-3">✋ Giơ tay ({raisedHands.length})</h3>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {raisedHands.map((h, i) => (
                          <div key={h.userId} className="flex items-center justify-between bg-white/5 p-2 rounded-lg">
                            <span className="text-white text-sm">#{i + 1} User {h.userId}</span>
                            <button onClick={() => lowerHand(h.userId)} className="text-xs text-slate-400 hover:text-white">Hạ</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                <h3 className="text-sm font-medium text-slate-400 mb-3">💬 Chat</h3>
                <div className="flex gap-2">
                  <input placeholder="Tin nhắn..." value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendChat()}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  <button onClick={sendChat} className="px-4 py-2.5 bg-purple-500 text-white rounded-xl hover:bg-purple-600">📤</button>
                </div>
              </div>
            </div>

            {/* Right: Participants & Logs */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                <h3 className="text-sm font-medium text-slate-400 mb-3">👥 Người tham gia ({participants.length + 1})</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <div className="flex items-center justify-between bg-purple-500/20 p-3 rounded-lg">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-white text-sm font-medium">{userName} (Bạn)</span>
                      {isHost && <span className="text-[10px] bg-amber-500 text-white px-1.5 rounded">Host</span>}
                    </div>
                    <div className="flex gap-1.5 items-center">
                      <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${myMediaState.audio ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                        <span className={`text-sm ${myMediaState.audio ? 'text-emerald-400' : 'text-red-400'}`}>🎤</span>
                      </div>
                      <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${myMediaState.video ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                        <span className={`text-sm ${myMediaState.video ? 'text-emerald-400' : 'text-red-400'}`}>📹</span>
                      </div>
                      {myMediaState.screen && (
                        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/20">
                          <span className="text-sm text-blue-400">🖥️</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {participants.map(p => {
                    const media = participantsMedia.get(p.userId) || { audio: true, video: true, screen: false };
                    return (
                      <div key={p.userId} className="flex items-center justify-between bg-white/5 p-3 rounded-lg group">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-white text-sm truncate">{p.userName || `User ${p.userId}`}</span>
                        </div>
                        <div className="flex gap-1 items-center">
                          <div className={`flex items-center justify-center w-6 h-6 rounded ${media.audio ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                            <span className={`text-xs ${media.audio ? 'text-emerald-400' : 'text-red-400'}`}>{media.audio ? '🎤' : '🔇'}</span>
                          </div>
                          <div className={`flex items-center justify-center w-6 h-6 rounded ${media.video ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                            <span className={`text-xs ${media.video ? 'text-emerald-400' : 'text-red-400'}`}>{media.video ? '📹' : '📷'}</span>
                          </div>
                          {media.screen && (
                            <div className="flex items-center justify-center w-6 h-6 rounded bg-blue-500/20">
                              <span className="text-xs text-blue-400">🖥️</span>
                            </div>
                          )}
                          {isHost && (
                            <div className="flex gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition">
                              <button onClick={() => muteParticipant(p.userId, true)} className="w-6 h-6 bg-yellow-500/30 text-yellow-400 rounded text-xs hover:bg-yellow-500/50" title="Mute">🔇</button>
                              <button onClick={() => disableCamera(p.userId, true)} className="w-6 h-6 bg-orange-500/30 text-orange-400 rounded text-xs hover:bg-orange-500/50" title="Tắt cam">📷</button>
                              <button onClick={() => kickParticipant(p.userId)} className="w-6 h-6 bg-red-500/30 text-red-400 rounded text-xs hover:bg-red-500/50" title="Kick">✕</button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                <h3 className="text-sm font-medium text-slate-400 mb-3">📜 Logs</h3>
                <div className="h-64 overflow-y-auto bg-black/30 rounded-lg p-2 font-mono text-xs space-y-1">
                  {logs.map((log) => (
                    <div key={log.id} className={logColor(log.type)}>
                      <span className="text-slate-500">[{log.time}]</span> {log.message}
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
