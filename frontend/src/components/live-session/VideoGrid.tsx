
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { VideoTile, type Participant } from './VideoTile';

interface VideoGridProps {
  participants: Participant[];
  pinnedParticipantId?: string;
  localParticipantId: string;
  localStream?: MediaStream | null;
  screenStream?: MediaStream | null;
  onPin?: (id: string) => void;
  onMute?: (id: string) => void;
  onRemove?: (id: string) => void;
  layout?: 'auto' | 'grid' | 'spotlight' | 'sidebar';
  className?: string;
}

const VideoGrid = ({
  participants,
  pinnedParticipantId,
  localParticipantId,
  localStream,
  screenStream,
  onPin,
  onMute,
  onRemove,
  layout = 'auto',
  className,
}: VideoGridProps) => {
  const participantCount = participants.length;
  const pinnedParticipant = participants.find((p) => p.id === pinnedParticipantId);
  const otherParticipants = participants.filter((p) => p.id !== pinnedParticipantId);

  // Determine layout based on participant count
  const getAutoLayout = () => {
    if (pinnedParticipant) return 'spotlight';
    return 'grid';
  };

  const effectiveLayout = layout === 'auto' ? getAutoLayout() : layout;

  // Grid layout classes based on participant count
  const getGridClasses = () => {
    if (participantCount === 1) return 'grid-cols-1';
    if (participantCount === 2) return 'grid-cols-2';
    if (participantCount <= 4) return 'grid-cols-2';
    if (participantCount <= 6) return 'grid-cols-3';
    if (participantCount <= 9) return 'grid-cols-3';
    return 'grid-cols-4';
  };

  const getTileSize = (): 'small' | 'medium' | 'large' | 'featured' => {
    if (participantCount === 1) return 'featured';
    if (participantCount === 2) return 'large';
    if (participantCount <= 4) return 'medium';
    return 'small';
  };

  // Helper to get stream for participant - always use camera stream here
  // Screen share is handled separately in the main page
  const getParticipantWithStream = (p: Participant): Participant => {
    const isLocal = p.id === localParticipantId;
    if (isLocal) {
      // Always use localStream (camera) for participant display
      return {
        ...p,
        stream: localStream,
      };
    }
    return p;
  };

  // Sidebar layout (first participant featured, rest in sidebar)
  if (effectiveLayout === 'sidebar') {
    const featuredParticipant = participants[0];
    const sidebarParticipants = participants.slice(1);
    
    if (featuredParticipant) {
      const featuredWithStream = getParticipantWithStream(featuredParticipant);
      
      return (
        <div className={cn('flex h-full gap-3', className)}>
          {/* Featured video */}
          <div className="flex-1 min-w-0">
            <VideoTile
              participant={{ ...featuredWithStream, isPinned: false }}
              isLocal={featuredParticipant.id === localParticipantId}
              size="featured"
              onPin={onPin}
              onMute={onMute}
              onRemove={onRemove}
              className="h-full"
            />
          </div>

          {/* Sidebar with other participants */}
          {sidebarParticipants.length > 0 && (
            <div className="w-64 shrink-0 flex flex-col gap-3 overflow-y-auto scrollbar-hide">
              {sidebarParticipants.map((participant) => (
                <VideoTile
                  key={participant.id}
                  participant={getParticipantWithStream(participant)}
                  isLocal={participant.id === localParticipantId}
                  size="small"
                  onPin={onPin}
                  onMute={onMute}
                  onRemove={onRemove}
                />
              ))}
            </div>
          )}
        </div>
      );
    }
  }

  // Spotlight layout (one featured + others in sidebar)
  if (effectiveLayout === 'spotlight' && pinnedParticipant) {
    const featuredWithStream = getParticipantWithStream(pinnedParticipant);
    
    return (
      <div className={cn('flex h-full gap-3', className)}>
        {/* Featured video */}
        <div className="flex-1 min-w-0">
          <VideoTile
            participant={{ ...featuredWithStream, isPinned: true }}
            isLocal={pinnedParticipant.id === localParticipantId}
            size="featured"
            onPin={onPin}
            onMute={onMute}
            onRemove={onRemove}
            className="h-full"
          />
        </div>

        {/* Sidebar with other participants */}
        {otherParticipants.length > 0 && (
          <div className="w-64 shrink-0 flex flex-col gap-3 overflow-y-auto scrollbar-hide">
            {otherParticipants.map((participant) => (
              <VideoTile
                key={participant.id}
                participant={getParticipantWithStream(participant)}
                isLocal={participant.id === localParticipantId}
                size="small"
                onPin={onPin}
                onMute={onMute}
                onRemove={onRemove}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Grid layout
  return (
    <motion.div
      layout
      className={cn(
        'grid gap-3 h-full auto-rows-fr',
        getGridClasses(),
        className
      )}
    >
      {participants.map((participant) => (
        <VideoTile
          key={participant.id}
          participant={{
            ...getParticipantWithStream(participant),
            isPinned: participant.id === pinnedParticipantId,
          }}
          isLocal={participant.id === localParticipantId}
          size={getTileSize()}
          onPin={onPin}
          onMute={onMute}
          onRemove={onRemove}
        />
      ))}
    </motion.div>
  );
};

export { VideoGrid };
