import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  Search,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Crown,
  Hand,
  MoreVertical,
  UserMinus,
  Volume2,
  VolumeX,
  Pin,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';

import { Input } from '@/components/ui/Input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/Dropdown';
import type { Participant } from './VideoTile';

interface ParticipantsPanelProps {
  participants: Participant[];
  currentUserId: string;
  isHost: boolean;
  onMuteParticipant?: (id: string) => void;
  onRemoveParticipant?: (id: string) => void;
  onPinParticipant?: (id: string) => void;
  onMuteAll?: () => void;
  className?: string;
}

const ParticipantsPanel = ({
  participants,
  currentUserId,
  isHost,
  onMuteParticipant,
  onRemoveParticipant,
  onPinParticipant,
  onMuteAll,
  className,
}: ParticipantsPanelProps) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredParticipants = participants.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hosts = filteredParticipants.filter((p) => p.isHost);
  const others = filteredParticipants.filter((p) => !p.isHost);
  const handsRaised = filteredParticipants.filter((p) => p.isHandRaised);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
            Người tham gia ({participants.length})
          </h3>
          {isHost && (
            <Button variant="ghost" size="sm" onClick={onMuteAll}>
              <VolumeX className="h-4 w-4 mr-1" />
              Tắt tất cả
            </Button>
          )}
        </div>
        <Input
          placeholder="Tìm người tham gia..."
          leftIcon={<Search className="h-4 w-4" />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          inputSize="sm"
        />
      </div>

      {/* Hands raised section */}
      {handsRaised.length > 0 && (
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2 mb-3">
            <Hand className="h-4 w-4 text-warning-500" />
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Giơ tay ({handsRaised.length})
            </span>
          </div>
          <div className="space-y-2">
            {handsRaised.map((participant) => (
              <ParticipantItem
                key={participant.id}
                participant={participant}
                isCurrentUser={participant.id === currentUserId}
                isHost={isHost}
                onMute={onMuteParticipant}
                onRemove={onRemoveParticipant}
                onPin={onPinParticipant}
              />
            ))}
          </div>
        </div>
      )}

      {/* Participants list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {/* Hosts */}
        {hosts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Crown className="h-4 w-4 text-warning-500" />
              <span className="text-xs font-semibold text-neutral-500 uppercase">
                Chủ phòng ({hosts.length})
              </span>
            </div>
            <div className="space-y-2">
              {hosts.map((participant) => (
                <ParticipantItem
                  key={participant.id}
                  participant={participant}
                  isCurrentUser={participant.id === currentUserId}
                  isHost={isHost}
                  onMute={onMuteParticipant}
                  onRemove={onRemoveParticipant}
                  onPin={onPinParticipant}
                />
              ))}
            </div>
          </div>
        )}

        {/* Other participants */}
        {others.length > 0 && (
          <div>
            <span className="text-xs font-semibold text-neutral-500 uppercase">
              Thành viên ({others.length})
            </span>
            <div className="mt-3 space-y-2">
              {others.map((participant) => (
                <ParticipantItem
                  key={participant.id}
                  participant={participant}
                  isCurrentUser={participant.id === currentUserId}
                  isHost={isHost}
                  onMute={onMuteParticipant}
                  onRemove={onRemoveParticipant}
                  onPin={onPinParticipant}
                />
              ))}
            </div>
          </div>
        )}

        {filteredParticipants.length === 0 && (
          <div className="text-center py-8 text-neutral-500">
            Không tìm thấy người tham gia
          </div>
        )}
      </div>
    </div>
  );
};

// Participant item component
const ParticipantItem = ({
  participant,
  isCurrentUser,
  isHost,
  onMute,
  onRemove,
  onPin,
}: {
  participant: Participant;
  isCurrentUser: boolean;
  isHost: boolean;
  onMute?: (id: string) => void;
  onRemove?: (id: string) => void;
  onPin?: (id: string) => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center gap-3 p-2 rounded-xl',
        'hover:bg-neutral-100 dark:hover:bg-neutral-800',
        'transition-colors'
      )}
    >
      <div className="relative">
        <Avatar
          name={participant.name}
          src={participant.avatar}
          size="sm"
          showStatus={participant.isSpeaking}
          status={participant.isSpeaking ? 'online' : 'offline'}
        />
        {participant.isSpeaking && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-success-500 rounded-full border-2 border-white dark:border-neutral-900"
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
            {participant.name}
            {isCurrentUser && ' (Bạn)'}
          </span>
          {participant.isHost && (
            <Crown className="h-3 w-3 text-warning-500 fill-warning-500 shrink-0" />
          )}
        </div>
        {participant.isHandRaised && (
          <div className="flex items-center gap-1 text-xs text-warning-500">
            <Hand className="h-3 w-3" />
            Đang giơ tay
          </div>
        )}
      </div>

      {/* Status icons */}
      <div className="flex items-center gap-1.5">
        <div
          className={cn(
            'p-1 rounded-full',
            participant.isMuted ? 'bg-error-100 dark:bg-error-900/30' : 'bg-neutral-100 dark:bg-neutral-800'
          )}
        >
          {participant.isMuted ? (
            <MicOff className="h-3 w-3 text-error-500" />
          ) : (
            <Mic className="h-3 w-3 text-neutral-500" />
          )}
        </div>

        <div
          className={cn(
            'p-1 rounded-full',
            participant.isVideoOff ? 'bg-error-100 dark:bg-error-900/30' : 'bg-neutral-100 dark:bg-neutral-800'
          )}
        >
          {participant.isVideoOff ? (
            <VideoOff className="h-3 w-3 text-error-500" />
          ) : (
            <VideoIcon className="h-3 w-3 text-neutral-500" />
          )}
        </div>

        {/* Actions dropdown */}
        {!isCurrentUser && isHost && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="h-6 w-6">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onPin?.(participant.id)}>
                <Pin className="h-4 w-4 mr-2" />
                Ghim video
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMute?.(participant.id)}>
                {participant.isMuted ? (
                  <>
                    <Volume2 className="h-4 w-4 mr-2" />
                    Yêu cầu bật mic
                  </>
                ) : (
                  <>
                    <VolumeX className="h-4 w-4 mr-2" />
                    Tắt mic
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onRemove?.(participant.id)}
                destructive
              >
                <UserMinus className="h-4 w-4 mr-2" />
                Xóa khỏi phòng
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </motion.div>
  );
};

export { ParticipantsPanel };
