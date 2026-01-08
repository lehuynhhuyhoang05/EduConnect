import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn, formatDate } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Video,
  Clock,
  Users,
  Calendar,
  ChevronRight,
  Loader2,
  Filter,
  Play,
  CheckCircle2,
  RadioTower,
  BookOpen,
  Timer,
  MoreVertical,
  Trash2,
  Edit,
  StopCircle,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/Dropdown';
import { useLiveSessions, useLiveSessionsActive, useDeleteSession, useEndSession } from '@/hooks/useLiveSessions';
import { useCurrentUser } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { LiveSession } from '@/types';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Get status configuration
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'live':
      return {
        label: 'Đang diễn ra',
        variant: 'success' as const,
        icon: RadioTower,
        bgColor: 'bg-success-50 dark:bg-success-900/20',
        borderColor: 'border-success-200 dark:border-success-800',
        pulse: true,
      };
    case 'scheduled':
      return {
        label: 'Sắp diễn ra',
        variant: 'primary' as const,
        icon: Calendar,
        bgColor: 'bg-primary-50 dark:bg-primary-900/20',
        borderColor: 'border-primary-200 dark:border-primary-800',
        pulse: false,
      };
    case 'ended':
      return {
        label: 'Đã kết thúc',
        variant: 'default' as const,
        icon: CheckCircle2,
        bgColor: 'bg-neutral-50 dark:bg-neutral-900/20',
        borderColor: 'border-neutral-200 dark:border-neutral-800',
        pulse: false,
      };
    case 'cancelled':
      return {
        label: 'Đã hủy',
        variant: 'error' as const,
        icon: Clock,
        bgColor: 'bg-error-50 dark:bg-error-900/20',
        borderColor: 'border-error-200 dark:border-error-800',
        pulse: false,
      };
    default:
      return {
        label: 'Không xác định',
        variant: 'default' as const,
        icon: Clock,
        bgColor: 'bg-neutral-50 dark:bg-neutral-900/20',
        borderColor: 'border-neutral-200 dark:border-neutral-800',
        pulse: false,
      };
  }
};

// Color gradient based on session id
const getSessionGradient = (id: number) => {
  const gradients = [
    'from-blue-500 to-cyan-400',
    'from-purple-500 to-pink-400',
    'from-green-500 to-teal-400',
    'from-orange-500 to-yellow-400',
    'from-red-500 to-rose-400',
    'from-indigo-500 to-violet-400',
  ];
  return gradients[id % gradients.length];
};

// Calculate time until session starts
const getTimeUntilStart = (scheduledAt: string | Date) => {
  const now = new Date();
  const scheduled = new Date(scheduledAt);
  const diff = scheduled.getTime() - now.getTime();

  if (diff <= 0) return null;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} ngày`;
  if (hours > 0) return `${hours} giờ`;
  return `${minutes} phút`;
};

interface LiveSessionCardProps {
  session: LiveSession;
  onClick: () => void;
  isTeacher: boolean;
  onDelete: (id: number) => void;
  onEnd: (id: number) => void;
}

const LiveSessionCard = ({ session, onClick, isTeacher, onDelete, onEnd }: LiveSessionCardProps) => {
  const statusConfig = getStatusConfig(session.status);
  const StatusIcon = statusConfig.icon;
  const timeUntil = session.scheduledAt ? getTimeUntilStart(session.scheduledAt) : null;

  return (
    <motion.div variants={itemVariants}>
      <Card
        className={cn(
          'group cursor-pointer overflow-hidden transition-all duration-300',
          'hover:shadow-lg hover:shadow-primary-500/10',
          'hover:border-primary-500/50',
          'relative',
          session.status === 'live' && 'ring-2 ring-success-500/50'
        )}
        onClick={onClick}
      >
        {/* Gradient header */}
        <div
          className={cn(
            'h-2 bg-gradient-to-r',
            getSessionGradient(session.id)
          )}
        />

        <CardContent className="p-5">
          {/* Status badge and actions */}
          <div className="flex items-start justify-between mb-4">
            <div className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
              statusConfig.bgColor,
              statusConfig.borderColor,
              'border'
            )}>
              <StatusIcon className={cn(
                'h-3.5 w-3.5',
                statusConfig.pulse && 'animate-pulse text-success-500'
              )} />
              <span>{statusConfig.label}</span>
            </div>

            {/* Teacher actions dropdown */}
            {isTeacher && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onClick();
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Chỉnh sửa
                  </DropdownMenuItem>
                  
                  {/* End session option - only show for live sessions */}
                  {session.status === 'live' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Bạn có chắc muốn KẾT THÚC phiên "${session.title}"?`)) {
                            onEnd(session.id);
                          }
                        }}
                        className="text-warning-600 focus:text-warning-600 focus:bg-warning-50"
                      >
                        <StopCircle className="h-4 w-4 mr-2" />
                        Kết thúc phiên
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Bạn có chắc muốn xóa phiên "${session.title}"?`)) {
                        onDelete(session.id);
                      }
                    }}
                    className="text-error-600 focus:text-error-600 focus:bg-error-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Xóa phiên
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Time/Live indicator - moved below */}
          <div className="flex items-center justify-end mb-2 -mt-2">

            {/* Time until start for scheduled sessions */}
            {session.status === 'scheduled' && timeUntil && (
              <div className="flex items-center gap-1 text-xs text-neutral-500">
                <Timer className="h-3.5 w-3.5" />
                <span>Còn {timeUntil}</span>
              </div>
            )}

            {/* Live indicator */}
            {session.status === 'live' && (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success-500" />
                </span>
                <span className="text-xs font-medium text-success-600 dark:text-success-400">
                  LIVE
                </span>
              </div>
            )}
          </div>

          {/* Session title */}
          <h3 className="font-semibold text-neutral-900 dark:text-white mb-2 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {session.title}
          </h3>

          {/* Description */}
          {session.description && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4 line-clamp-2">
              {session.description}
            </p>
          )}

          {/* Class info */}
          {session.class && (
            <div className="flex items-center gap-2 mb-4 text-sm text-neutral-600 dark:text-neutral-400">
              <BookOpen className="h-4 w-4" />
              <span className="line-clamp-1">{session.class.name}</span>
            </div>
          )}

          {/* Metadata row */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-4 text-xs text-neutral-500">
              {/* Scheduled time */}
              {session.scheduledAt && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDate(session.scheduledAt)}</span>
                </div>
              )}

              {/* Max participants */}

              {/* Participants count */}
              <div className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                <span>{session.participantsCount || 0}</span>
              </div>
            </div>

            {/* Join/View button */}
            <div className="flex items-center gap-2">
              {session.status === 'live' ? (
                <Button size="sm" className="gap-1.5">
                  <Play className="h-3.5 w-3.5" />
                  Tham gia
                </Button>
              ) : session.status === 'scheduled' ? (
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Video className="h-3.5 w-3.5" />
                  Xem chi tiết
                </Button>
              ) : (
                <ChevronRight className="h-5 w-5 text-neutral-400 group-hover:text-primary-500 transition-colors" />
              )}
            </div>
          </div>

          {/* Host info */}
          {session.host && (
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-xs font-medium">
                {session.host.fullName?.[0] || session.host.email?.[0]?.toUpperCase()}
              </div>
              <span className="text-xs text-neutral-500">
                {session.host.fullName || session.host.email}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default function LiveSessionsPage() {
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  const isTeacher = currentUser?.role === 'TEACHER';

  // Fetch sessions
  const { data: sessionsData, isLoading, error } = useLiveSessions();
  const { data: liveSessionsData } = useLiveSessionsActive();
  const deleteMutation = useDeleteSession();
  const endMutation = useEndSession();

  const sessions = sessionsData?.data || [];
  const liveSessions = liveSessionsData?.data || [];

  // Handle end session
  const handleEndSession = async (sessionId: number) => {
    try {
      await endMutation.mutateAsync(sessionId);
      toast.success('Đã kết thúc phiên học');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể kết thúc phiên học');
    }
  };

  // Handle delete session
  const handleDeleteSession = async (sessionId: number) => {
    try {
      await deleteMutation.mutateAsync(sessionId);
      toast.success('Đã xóa phiên học thành công');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể xóa phiên học');
    }
  };

  // Filter sessions
  const filteredSessions = React.useMemo(() => {
    return sessions.filter((session) => {
      // Search filter
      const matchesSearch = !searchQuery ||
        session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.class?.name?.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === 'all' || session.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [sessions, searchQuery, statusFilter]);

  // Stats
  const stats = React.useMemo(() => {
    return {
      total: sessions.length,
      live: sessions.filter(s => s.status === 'live').length,
      scheduled: sessions.filter(s => s.status === 'scheduled').length,
      ended: sessions.filter(s => s.status === 'ended').length,
    };
  }, [sessions]);

  const handleSessionClick = (session: LiveSession) => {
    navigate(`/live-sessions/${session.id}`);
  };

  if (error) {
    return (
      <PageContainer
        title="Phiên học trực tuyến"
        description="Quản lý và tham gia các phiên học trực tuyến"
      >
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-center">
            <Video className="h-16 w-16 text-neutral-300 dark:text-neutral-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
              Đã xảy ra lỗi
            </h3>
            <p className="text-neutral-500">
              Không thể tải danh sách phiên học. Vui lòng thử lại sau.
            </p>
            <Button
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Thử lại
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Phiên học trực tuyến"
      description="Quản lý và tham gia các phiên học trực tuyến"
      actions={
        isTeacher && (
          <Button onClick={() => navigate('/classes')} className="gap-2">
            <Plus className="h-4 w-4" />
            Tạo phiên mới
          </Button>
        )
      }
    >
      {/* Live sessions alert */}
      {liveSessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-gradient-to-r from-success-500/10 to-teal-500/10 border border-success-500/30 rounded-xl"
        >
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-success-500/20 flex items-center justify-center">
                <RadioTower className="h-6 w-6 text-success-500 animate-pulse" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-success-700 dark:text-success-400">
                {liveSessions.length} phiên học đang diễn ra
              </h3>
              <p className="text-sm text-success-600/80 dark:text-success-400/80">
                Nhấn vào phiên học để tham gia ngay
              </p>
            </div>
            <Button
              onClick={() => setStatusFilter('live')}
              variant="outline"
              className="border-success-500 text-success-600 hover:bg-success-500/10"
            >
              Xem ngay
            </Button>
          </div>
        </motion.div>
      )}

      {/* Stats cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
      >
        <motion.div variants={itemVariants}>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <Video className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {stats.total}
                </p>
                <p className="text-xs text-neutral-500">Tổng phiên học</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-4 ring-2 ring-success-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                <RadioTower className="h-5 w-5 text-success-600 dark:text-success-400 animate-pulse" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success-600 dark:text-success-400">
                  {stats.live}
                </p>
                <p className="text-xs text-neutral-500">Đang diễn ra</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {stats.scheduled}
                </p>
                <p className="text-xs text-neutral-500">Sắp diễn ra</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {stats.ended}
                </p>
                <p className="text-xs text-neutral-500">Đã kết thúc</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Search and filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Tìm kiếm phiên học..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-neutral-400" />
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'Tất cả' },
              { key: 'live', label: 'Đang diễn ra' },
              { key: 'scheduled', label: 'Sắp diễn ra' },
              { key: 'ended', label: 'Đã kết thúc' },
            ].map(({ key, label }) => (
              <Button
                key={key}
                size="sm"
                variant={statusFilter === key ? 'primary' : 'outline'}
                onClick={() => setStatusFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Sessions list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Video className="h-16 w-16 text-neutral-300 dark:text-neutral-700 mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
            {searchQuery || statusFilter !== 'all'
              ? 'Không tìm thấy phiên học'
              : 'Chưa có phiên học nào'}
          </h3>
          <p className="text-neutral-500 text-center max-w-md">
            {searchQuery || statusFilter !== 'all'
              ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm'
              : isTeacher
              ? 'Tạo phiên học đầu tiên để bắt đầu giảng dạy trực tuyến'
              : 'Các phiên học trực tuyến sẽ xuất hiện ở đây khi giáo viên tạo'}
          </p>
          {isTeacher && !searchQuery && statusFilter === 'all' && (
            <Button className="mt-4 gap-2" onClick={() => navigate('/classes')}>
              <Plus className="h-4 w-4" />
              Tạo phiên học
            </Button>
          )}
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredSessions.map((session) => (
            <LiveSessionCard
              key={session.id}
              session={session}
              onClick={() => handleSessionClick(session)}
              isTeacher={isTeacher}
              onDelete={handleDeleteSession}
              onEnd={handleEndSession}
            />
          ))}
        </motion.div>
      )}
    </PageContainer>
  );
}
