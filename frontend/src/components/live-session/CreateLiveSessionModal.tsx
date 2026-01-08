import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  X,
  Video,
  Calendar,
  Copy,
  Check,
  Users,
  Clock,
  Zap,
  Link2,
  QrCode,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateSession, useStartSession } from '@/hooks/useLiveSessions';

interface CreateLiveSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: number;
  className?: string;
  onSessionCreated?: (sessionId: number, shareUrl: string) => void;
}

type SessionMode = 'instant' | 'scheduled';

export const CreateLiveSessionModal: React.FC<CreateLiveSessionModalProps> = ({
  isOpen,
  onClose,
  classId,
  className: classNameProp,
  onSessionCreated,
}) => {
  const [mode, setMode] = React.useState<SessionMode>('instant');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [scheduledDate, setScheduledDate] = React.useState('');
  const [scheduledTime, setScheduledTime] = React.useState('');
  const [maxParticipants, setMaxParticipants] = React.useState(50);
  
  // Created session state
  const [createdSession, setCreatedSession] = React.useState<{
    id: number;
    shareUrl: string;
    qrCode: string;
  } | null>(null);
  const [copied, setCopied] = React.useState(false);

  const createSessionMutation = useCreateSession();
  const startSessionMutation = useStartSession();

  const generateShareUrl = (sessionId: number) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/live-sessions/${sessionId}`;
  };

  const generateQRCode = (url: string) => {
    // Using a free QR code API
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Vui lòng nhập tiêu đề phiên học');
      return;
    }

    try {
      let scheduledAt: string | undefined;
      
      if (mode === 'scheduled') {
        if (!scheduledDate || !scheduledTime) {
          toast.error('Vui lòng chọn ngày và giờ');
          return;
        }
        scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      }

      const session = await createSessionMutation.mutateAsync({
        classId,
        data: {
          title: title.trim(),
          description: description.trim() || undefined,
          scheduledAt,
          maxParticipants,
        },
      });

      const shareUrl = generateShareUrl(session.id);
      const qrCode = generateQRCode(shareUrl);

      // If instant, start immediately
      if (mode === 'instant') {
        await startSessionMutation.mutateAsync(session.id);
        toast.success('Phiên học đã bắt đầu!');
      } else {
        toast.success('Đã tạo phiên học!');
      }

      setCreatedSession({
        id: session.id,
        shareUrl,
        qrCode,
      });

      onSessionCreated?.(session.id, shareUrl);
    } catch (error) {
      console.error('Failed to create session:', error);
      toast.error('Không thể tạo phiên học');
    }
  };

  const handleCopyLink = () => {
    if (createdSession) {
      navigator.clipboard.writeText(createdSession.shareUrl);
      setCopied(true);
      toast.success('Đã sao chép link!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (createdSession && navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: `Tham gia phiên học: ${title}`,
          url: createdSession.shareUrl,
        });
      } catch (error) {
        // User cancelled or share failed
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleJoinNow = () => {
    if (createdSession) {
      window.location.href = createdSession.shareUrl;
    }
  };

  const handleClose = () => {
    setCreatedSession(null);
    setTitle('');
    setDescription('');
    setScheduledDate('');
    setScheduledTime('');
    setMode('instant');
    onClose();
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={cn(
            'relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden',
            classNameProp
          )}
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-primary-600 to-primary-500 p-6">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Video className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {createdSession ? 'Phiên học đã sẵn sàng!' : 'Tạo phiên học trực tuyến'}
                </h2>
                <p className="text-white/80 text-sm">
                  {createdSession 
                    ? 'Chia sẻ link để mời học viên tham gia'
                    : 'Bắt đầu ngay hoặc lên lịch cho sau'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            {createdSession ? (
              /* Share view */
              <div className="space-y-6">
                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-xl shadow-inner">
                    <img
                      src={createdSession.qrCode}
                      alt="QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                </div>

                {/* Share URL */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Link tham gia
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                      <Input
                        value={createdSession.shareUrl}
                        readOnly
                        className="pl-10 pr-4 font-mono text-sm"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleCopyLink}
                      className="shrink-0"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-success-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleShare}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Chia sẻ
                  </Button>
                  {mode === 'instant' && (
                    <Button
                      className="flex-1"
                      onClick={handleJoinNow}
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Vào phiên học
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              /* Create form */
              <div className="space-y-6">
                {/* Mode selector */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMode('instant')}
                    className={cn(
                      'p-4 rounded-xl border-2 transition-all text-left',
                      mode === 'instant'
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-primary-300'
                    )}
                  >
                    <Zap className={cn(
                      'h-6 w-6 mb-2',
                      mode === 'instant' ? 'text-primary-500' : 'text-neutral-400'
                    )} />
                    <div className="font-medium">Bắt đầu ngay</div>
                    <div className="text-xs text-neutral-500">
                      Tạo và bắt đầu phiên học ngay lập tức
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('scheduled')}
                    className={cn(
                      'p-4 rounded-xl border-2 transition-all text-left',
                      mode === 'scheduled'
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-primary-300'
                    )}
                  >
                    <Calendar className={cn(
                      'h-6 w-6 mb-2',
                      mode === 'scheduled' ? 'text-primary-500' : 'text-neutral-400'
                    )} />
                    <div className="font-medium">Lên lịch</div>
                    <div className="text-xs text-neutral-500">
                      Đặt lịch cho phiên học sau
                    </div>
                  </button>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Tiêu đề phiên học <span className="text-error-500">*</span>
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="VD: Buổi học Chương 5 - Lập trình hướng đối tượng"
                    className="w-full"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Mô tả (tùy chọn)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Nội dung sẽ được học trong buổi này..."
                    className="w-full px-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>

                {/* Schedule fields */}
                {mode === 'scheduled' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Ngày
                      </label>
                      <Input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        min={today}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Giờ
                      </label>
                      <Input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                {/* Max participants */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Số người tham gia tối đa
                  </label>
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-neutral-400" />
                    <Input
                      type="number"
                      value={maxParticipants}
                      onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 50)}
                      min={2}
                      max={500}
                      className="w-32"
                    />
                    <span className="text-sm text-neutral-500">người</span>
                  </div>
                </div>

                {/* Submit button */}
                <Button
                  onClick={handleCreate}
                  disabled={createSessionMutation.isPending || startSessionMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {(createSessionMutation.isPending || startSessionMutation.isPending) ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Đang tạo...
                    </div>
                  ) : mode === 'instant' ? (
                    <>
                      <Zap className="h-5 w-5 mr-2" />
                      Tạo và bắt đầu ngay
                    </>
                  ) : (
                    <>
                      <Calendar className="h-5 w-5 mr-2" />
                      Tạo phiên học
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreateLiveSessionModal;
