import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import {
  Mic,
  MicOff,

  VideoOff,
  Pin,
  MoreVertical,
  Volume2,
  VolumeX,
  Hand,
  Crown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/Dropdown';
import { Button } from '@/components/ui/Button';

export interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isHost?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isSpeaking?: boolean;
  isHandRaised?: boolean;
  isPinned?: boolean;
  isScreenSharing?: boolean;
  stream?: MediaStream | null;
}

interface VideoTileProps {
  participant: Participant;
  isLocal?: boolean;
  size?: 'small' | 'medium' | 'large' | 'featured';
  showControls?: boolean;
  onPin?: (id: string) => void;
  onMute?: (id: string) => void;
  onRemove?: (id: string) => void;
  className?: string;
}

const VideoTile = React.forwardRef<HTMLDivElement, VideoTileProps>(
  (
    {
      participant,
      isLocal = false,
      size = 'medium',
      showControls = true,
      onPin,
      onMute,
      onRemove,
      className,
    },
    ref
  ) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const videoRef = React.useRef<HTMLVideoElement>(null);

    // Attach stream to video element
    React.useEffect(() => {
      if (videoRef.current && participant.stream) {
        videoRef.current.srcObject = participant.stream;
      }
    }, [participant.stream]);

    const sizeClasses = {
      small: 'aspect-video min-h-[120px]',
      medium: 'aspect-video min-h-[180px]',
      large: 'aspect-video min-h-[280px]',
      featured: 'aspect-video min-h-[400px]',
    };

    return (
      <motion.div
        ref={ref}
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'relative rounded-2xl overflow-hidden',
          'bg-neutral-900',
          sizeClasses[size],
          participant.isSpeaking && 'ring-2 ring-success-500 ring-offset-2 ring-offset-neutral-950',
          participant.isPinned && 'ring-2 ring-primary-500',
          className
        )}
      >
        {/* Video/Avatar */}
        {participant.isVideoOff ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
            <Avatar
              name={participant.name}
              size={size === 'small' ? 'lg' : size === 'featured' ? '3xl' : '2xl'}
            />
          </div>
        ) : participant.stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            className={cn(
              "absolute inset-0 w-full h-full object-cover",
              isLocal && "transform scale-x-[-1]"
            )}
          />
        ) : (
          <div className="absolute inset-0 bg-neutral-800">
            {/* Placeholder for video stream */}
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-full h-full bg-gradient-to-br from-neutral-700 to-neutral-900" />
            </div>
          </div>
        )}

        {/* Speaking indicator animation */}
        <AnimatePresence>
          {participant.isSpeaking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-success-500/20 to-transparent" />
              {/* Audio wave animation */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-0.5 h-6">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-success-500 rounded-full"
                    animate={{
                      height: ['30%', '100%', '30%'],
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom info bar */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white truncate max-w-[150px]">
                {participant.name}
                {isLocal && ' (Bạn)'}
              </span>
              {participant.isHost && (
                <Crown className="h-4 w-4 text-warning-500 fill-warning-500" />
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {participant.isHandRaised && (
                <motion.div
                  animate={{ y: [0, -3, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6 }}
                  className="p-1 rounded-full bg-warning-500"
                >
                  <Hand className="h-3 w-3 text-white" />
                </motion.div>
              )}
              
              <div
                className={cn(
                  'p-1.5 rounded-full',
                  participant.isMuted ? 'bg-error-500' : 'bg-white/20'
                )}
              >
                {participant.isMuted ? (
                  <MicOff className="h-3 w-3 text-white" />
                ) : (
                  <Mic className="h-3 w-3 text-white" />
                )}
              </div>

              {participant.isVideoOff && (
                <div className="p-1.5 rounded-full bg-error-500">
                  <VideoOff className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pinned indicator */}
        {participant.isPinned && (
          <div className="absolute top-3 left-3">
            <Badge variant="primary" size="sm" icon={<Pin className="h-3 w-3" />}>
              Ghim
            </Badge>
          </div>
        )}

        {/* Screen sharing indicator */}
        {participant.isScreenSharing && (
          <div className="absolute top-3 right-3">
            <Badge variant="success" size="sm">
              Đang chia sẻ màn hình
            </Badge>
          </div>
        )}

        {/* Hover controls */}
        <AnimatePresence>
          {isHovered && showControls && !isLocal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-3 right-3"
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="glass"
                    size="icon-sm"
                    className="h-8 w-8 bg-black/50 hover:bg-black/70"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onPin?.(participant.id)}>
                    <Pin className="h-4 w-4 mr-2" />
                    {participant.isPinned ? 'Bỏ ghim' : 'Ghim video'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMute?.(participant.id)}>
                    {participant.isMuted ? (
                      <>
                        <Volume2 className="h-4 w-4 mr-2" />
                        Bật tiếng
                      </>
                    ) : (
                      <>
                        <VolumeX className="h-4 w-4 mr-2" />
                        Tắt tiếng
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onRemove?.(participant.id)}
                    destructive
                  >
                    Xóa khỏi phòng
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }
);
VideoTile.displayName = 'VideoTile';

export { VideoTile };
