import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  MonitorUp,
  MessageSquare,
  Users,
  Hand,
  MoreVertical,
  PhoneOff,
  Settings,
  Maximize2,
  Minimize2,
  ScreenShareOff,
  Circle,
  CircleStop,
  Smile,
  Layout,
  PanelRightOpen,
  PanelRightClose,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/Tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/Dropdown';

interface ControlBarProps {
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isRecording: boolean;
  isHandRaised: boolean;
  isFullscreen: boolean;
  isSidePanelOpen: boolean;
  unreadMessages: number;
  participantCount: number;
  layout: 'auto' | 'grid' | 'spotlight' | 'sidebar';
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleRecording: () => void;
  onToggleHandRaise: () => void;
  onToggleFullscreen: () => void;
  onToggleSidePanel: (panel: 'chat' | 'participants') => void;
  onLeaveSession: () => void;
  onOpenSettings: () => void;
  onReaction?: (emoji: string) => void;
  onLayoutChange: (layout: 'auto' | 'grid' | 'spotlight' | 'sidebar') => void;
  className?: string;
}

const ControlBar = ({
  isMuted,
  isVideoOff,
  isScreenSharing,
  isRecording,
  isHandRaised,
  isFullscreen,
  isSidePanelOpen,
  unreadMessages,
  participantCount,
  layout,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleRecording,
  onToggleHandRaise,
  onToggleFullscreen,
  onToggleSidePanel,
  onLeaveSession,
  onOpenSettings,
  onReaction,
  onLayoutChange,
  className,
}: ControlBarProps) => {
  const [showReactions, setShowReactions] = React.useState(false);

  const reactions = ['👍', '❤️', '😂', '😮', '👏', '🎉'];

  const ControlButton = ({
    icon: Icon,
    label,
    isActive,
    isDestructive,
    badge,
    onClick,
  }: {
    icon: React.ElementType;
    label: string;
    isActive?: boolean;
    isDestructive?: boolean;
    badge?: number;
    onClick: () => void;
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isDestructive ? 'danger' : isActive ? 'primary' : 'glass'}
          size="icon"
          onClick={onClick}
          className={cn(
            'relative h-12 w-12 rounded-full',
            !isDestructive && !isActive && 'bg-white/10 hover:bg-white/20 text-white',
            isActive && 'bg-primary-600 hover:bg-primary-700'
          )}
        >
          <Icon className="h-5 w-5" />
          {badge !== undefined && badge > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-error-500 text-white text-xs font-bold rounded-full">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );

  return (
    <TooltipProvider>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={cn(
          'flex items-center justify-center gap-2 p-4',
          'bg-neutral-950/90 backdrop-blur-xl',
          'border-t border-white/10',
          className
        )}
      >
        {/* Left section - Meeting info */}
        <div className="absolute left-4 flex items-center gap-3">
          {isRecording && (
            <Badge variant="error" size="sm" className="animate-pulse">
              <CircleStop className="h-3 w-3 mr-1" />
              Đang ghi
            </Badge>
          )}
          <div className="text-sm text-white/60">
            {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* Center controls */}
        <div className="flex items-center gap-2">
          {/* Mic toggle */}
          <ControlButton
            icon={isMuted ? MicOff : Mic}
            label={isMuted ? 'Bật mic' : 'Tắt mic'}
            isActive={isMuted}
            onClick={onToggleMute}
          />

          {/* Video toggle */}
          <ControlButton
            icon={isVideoOff ? VideoOff : VideoIcon}
            label={isVideoOff ? 'Bật camera' : 'Tắt camera'}
            isActive={isVideoOff}
            onClick={onToggleVideo}
          />

          {/* Screen share */}
          <ControlButton
            icon={isScreenSharing ? ScreenShareOff : MonitorUp}
            label={isScreenSharing ? 'Dừng chia sẻ' : 'Chia sẻ màn hình'}
            isActive={isScreenSharing}
            onClick={onToggleScreenShare}
          />

          {/* Hand raise */}
          <ControlButton
            icon={Hand}
            label={isHandRaised ? 'Hạ tay' : 'Giơ tay'}
            isActive={isHandRaised}
            onClick={onToggleHandRaise}
          />

          {/* Reactions */}
          <DropdownMenu open={showReactions} onOpenChange={setShowReactions}>
            <DropdownMenuTrigger asChild>
              <div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="glass"
                      size="icon"
                      className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white"
                    >
                      <Smile className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Reactions</TooltipContent>
                </Tooltip>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" className="p-2">
              <div className="flex gap-2">
                {reactions.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReaction?.(emoji);
                      setShowReactions(false);
                    }}
                    className="text-2xl hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* More options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="glass"
                size="icon"
                className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top">
              <DropdownMenuItem onClick={onToggleRecording}>
                <Circle className="h-4 w-4 mr-2" />
                {isRecording ? 'Dừng ghi hình' : 'Ghi hình'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs font-semibold text-neutral-500">Bố cục</div>
              <DropdownMenuItem onClick={() => onLayoutChange('auto')}>
                <Layout className="h-4 w-4 mr-2" />
                Tự động
                {layout === 'auto' && <span className="ml-auto text-primary-500">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onLayoutChange('grid')}>
                <Layout className="h-4 w-4 mr-2" />
                Lưới
                {layout === 'grid' && <span className="ml-auto text-primary-500">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onLayoutChange('spotlight')}>
                <Layout className="h-4 w-4 mr-2" />
                Nổi bật
                {layout === 'spotlight' && <span className="ml-auto text-primary-500">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onLayoutChange('sidebar')}>
                <Layout className="h-4 w-4 mr-2" />
                Thanh bên
                {layout === 'sidebar' && <span className="ml-auto text-primary-500">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onOpenSettings}>
                <Settings className="h-4 w-4 mr-2" />
                Cài đặt
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-8 bg-white/20 mx-2" />

          {/* Leave */}
          <ControlButton
            icon={PhoneOff}
            label="Rời phòng"
            isDestructive
            onClick={onLeaveSession}
          />
        </div>

        {/* Right section */}
        <div className="absolute right-4 flex items-center gap-2">
          {/* Participants */}
          <ControlButton
            icon={Users}
            label="Người tham gia"
            badge={participantCount}
            onClick={() => onToggleSidePanel('participants')}
          />

          {/* Chat */}
          <ControlButton
            icon={MessageSquare}
            label="Trò chuyện"
            badge={unreadMessages}
            onClick={() => onToggleSidePanel('chat')}
          />

          {/* Fullscreen */}
          <ControlButton
            icon={isFullscreen ? Minimize2 : Maximize2}
            label={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
            onClick={onToggleFullscreen}
          />

          {/* Side panel toggle */}
          <ControlButton
            icon={isSidePanelOpen ? PanelRightClose : PanelRightOpen}
            label={isSidePanelOpen ? 'Đóng bảng' : 'Mở bảng'}
            onClick={() => onToggleSidePanel('chat')}
          />
        </div>
      </motion.div>
    </TooltipProvider>
  );
};

export { ControlBar };
