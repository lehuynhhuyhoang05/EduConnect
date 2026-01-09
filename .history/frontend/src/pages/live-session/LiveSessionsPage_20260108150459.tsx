import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Calendar,
  Clock,
  Users,
  Video,
  VideoOff,
  MoreVertical,
  Edit,
  Trash2,
  Play,
  Square,
  ExternalLink,
  ChevronDown,
  Radio,
} from 'lucide-react';
import {
  useLiveSessions,
  useDeleteLiveSession,
  useEndLiveSession,
  useStartLiveSession,
} from '../../hooks/useLiveSessions';
import { useMyClasses } from '../../hooks/useClasses';
import { useAuthStore } from '../../store';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export function LiveSessionsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'scheduled' | 'ended'>('all');
  const [_showCreateModal, setShowCreateModal] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const { data: classes } = useMyClasses();
  const { data: sessionsData, isLoading } = useLiveSessions({
    classId: selectedClass !== 'all' ? selectedClass : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });
  const deleteSession = useDeleteLiveSession();
  const endSession = useEndLiveSession();
  const startSession = useStartLiveSession();

  const sessions = sessionsData?.data || [];

  // Filter sessions
  const filteredSessions = sessions.filter((session) => {
    if (searchQuery && !session.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Stats
  const stats = {
    total: sessions.length,
    active: sessions.filter((s) => s.status === 'active').length,
    scheduled: sessions.filter((s) => s.status === 'scheduled').length,
    ended: sessions.filter((s) => s.status === 'ended').length,
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa phiên học này?')) {
      try {
        await deleteSession.mutateAsync(id);
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    }
    setMenuOpenId(null);
  };

  const handleEndSession = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn kết thúc phiên học này?')) {
      try {
        await endSession.mutateAsync(id);
      } catch (error) {
        console.error('Failed to end session:', error);
      }
    }
    setMenuOpenId(null);
  };

  const handleStartSession = async (id: string) => {
    try {
      await startSession.mutateAsync(id);
      navigate(`/live-session/${id}`);
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const getStatusBadge = (session: any) => {
    switch (session.status) {
      case 'active':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-success-50 text-success-600 dark:bg-success-500/20 dark:text-success-400">
            <Radio className="w-3 h-3 animate-pulse" />
            Đang diễn ra
          </span>
        );
      case 'scheduled':
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-warning-50 text-warning-600 dark:bg-warning-500/20 dark:text-warning-400">
            Sắp diễn ra
          </span>
        );
      case 'ended':
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400">
            Đã kết thúc
          </span>
        );
      default:
        return null;
    }
  };

  const isHost = (session: any) => session.hostId === user?.id;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
          Phiên học trực tuyến
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Quản lý và tham gia các phiên học video call
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center">
              <Video className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {stats.total}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Tổng phiên học
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-success-50 dark:bg-success-500/20 flex items-center justify-center">
              <Radio className="w-6 h-6 text-success-600 dark:text-success-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {stats.active}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Đang diễn ra
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-warning-50 dark:bg-warning-500/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-warning-600 dark:text-warning-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {stats.scheduled}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Sắp diễn ra
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
              <VideoOff className="w-6 h-6 text-neutral-600 dark:text-neutral-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {stats.ended}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Đã kết thúc
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-soft p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Tìm kiếm phiên học..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-neutral-900 dark:text-white"
            />
          </div>

          {/* Class filter */}
          <div className="relative">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer min-w-[180px] text-neutral-900 dark:text-white"
            >
              <option value="all">Tất cả lớp học</option>
              {classes?.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          </div>

          {/* Status filter */}
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'Tất cả' },
              { key: 'active', label: 'Đang diễn ra' },
              { key: 'scheduled', label: 'Sắp tới' },
              { key: 'ended', label: 'Đã kết thúc' },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setStatusFilter(filter.key as any)}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  statusFilter === filter.key
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Create button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Tạo phiên học
          </button>
        </div>
      </div>

      {/* Sessions List */}
      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-neutral-800 rounded-2xl p-6 animate-pulse">
              <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3 mb-4" />
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-2/3 mb-2" />
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-soft p-12 text-center">
          <Video className="w-16 h-16 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
            Không có phiên học nào
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            {searchQuery
              ? 'Không tìm thấy phiên học phù hợp với tìm kiếm của bạn'
              : 'Bắt đầu bằng cách tạo phiên học mới'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Tạo phiên học đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {filteredSessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-neutral-800 rounded-2xl shadow-soft hover:shadow-soft-lg transition-all"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            session.status === 'active'
                              ? 'bg-success-100 dark:bg-success-500/20'
                              : 'bg-primary-100 dark:bg-primary-500/20'
                          }`}
                        >
                          <Video
                            className={`w-5 h-5 ${
                              session.status === 'active'
                                ? 'text-success-600 dark:text-success-400'
                                : 'text-primary-600 dark:text-primary-400'
                            }`}
                          />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                            {session.title}
                          </h3>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {session.class?.name}
                          </p>
                        </div>
                      </div>

                      {session.description && (
                        <p className="text-neutral-600 dark:text-neutral-400 mb-4 line-clamp-2">
                          {session.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {format(new Date(session.scheduledAt || session.startTime || new Date()), 'HH:mm - dd/MM/yyyy', {
                              locale: vi,
                            })}
                          </span>
                        </div>
                        {session.duration && (
                          <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                            <Clock className="w-4 h-4" />
                            <span>{session.duration} phút</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                          <Users className="w-4 h-4" />
                          <span>{session.participantCount || 0} người tham gia</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {getStatusBadge(session)}

                      {/* Action buttons */}
                      {session.status === 'active' && (
                        <button
                          onClick={() => navigate(`/live-session/${session.id}`)}
                          className="flex items-center gap-2 px-4 py-2 bg-success-500 text-white rounded-xl font-medium hover:bg-success-600 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Tham gia
                        </button>
                      )}

                      {session.status === 'scheduled' && isHost(session) && (
                        <button
                          onClick={() => handleStartSession(session.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          Bắt đầu
                        </button>
                      )}

                      {/* More menu */}
                      {isHost(session) && (
                        <div className="relative">
                          <button
                            onClick={() =>
                              setMenuOpenId(menuOpenId === session.id ? null : session.id)
                            }
                            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-5 h-5 text-neutral-400" />
                          </button>

                          <AnimatePresence>
                            {menuOpenId === session.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 py-2 z-10"
                              >
                                <button
                                  onClick={() => {
                                    navigate(`/live-sessions/${session.id}/edit`);
                                    setMenuOpenId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                >
                                  <Edit className="w-4 h-4" />
                                  Chỉnh sửa
                                </button>

                                {session.status === 'active' && (
                                  <button
                                    onClick={() => handleEndSession(session.id)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-warning-600 hover:bg-warning-50 dark:hover:bg-warning-500/10"
                                  >
                                    <Square className="w-4 h-4" />
                                    Kết thúc phiên
                                  </button>
                                )}

                                <button
                                  onClick={() => handleDelete(session.id)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Xóa phiên
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
