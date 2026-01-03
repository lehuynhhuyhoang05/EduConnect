import { useEffect, useRef } from 'react';

interface VideoPlayerProps {
  stream: MediaStream | null;
  muted?: boolean;
  mirrored?: boolean;
  userName?: string;
  isLocal?: boolean;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
}

export default function VideoPlayer({
  stream,
  muted = false,
  mirrored = false,
  userName,
  isLocal = false,
  audioEnabled = true,
  videoEnabled = true,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative bg-slate-800 rounded-xl overflow-hidden shadow-lg aspect-video">
      {stream && videoEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={`w-full h-full object-cover ${mirrored ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-4xl">👤</span>
            </div>
            <p className="text-white font-medium">{userName || 'User'}</p>
            <p className="text-slate-400 text-sm mt-1">
              {!stream ? 'Đang kết nối...' : 'Camera tắt'}
            </p>
          </div>
        </div>
      )}

      {/* User info overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium text-sm">
              {userName || 'User'}
              {isLocal && ' (Bạn)'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* Audio indicator */}
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${audioEnabled ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
              <span className="text-xs">{audioEnabled ? '🎤' : '🔇'}</span>
            </div>
            {/* Video indicator */}
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${videoEnabled ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
              <span className="text-xs">{videoEnabled ? '📹' : '📷'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Connection quality indicator */}
      {stream && (
        <div className="absolute top-2 right-2">
          <div className="bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-white text-xs">Live</span>
          </div>
        </div>
      )}
    </div>
  );
}
