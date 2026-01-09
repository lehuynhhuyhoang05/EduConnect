import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Calendar,
  Clock,
  FileText,
  MoreVertical,
  Edit,
  Trash2,
  Users,
  ChevronDown,
} from 'lucide-react';
import { useAssignments, useDeleteAssignment } from '../../hooks/useAssignments';
import { useMyClasses } from '../../hooks/useClasses';
import { format, isPast, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

export function AssignmentsPage() {
  const navigate = useNavigate();
  const { classId } = useParams<{ classId?: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>(classId || 'all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'past' | 'upcoming'>('all');
  const [_showCreateModal, setShowCreateModal] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | number | null>(null);

  const { data: classes } = useMyClasses();
  const { data: assignmentsData, isLoading } = useAssignments({
    classId: selectedClass !== 'all' ? selectedClass : undefined,
  });
  const deleteAssignment = useDeleteAssignment();

  const assignments = assignmentsData?.data || [];

  // Filter assignments
  const filteredAssignments = assignments.filter((assignment) => {
    // Search filter
    if (searchQuery && !assignment.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Status filter
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    
    if (statusFilter === 'active') {
      return !isPast(dueDate);
    } else if (statusFilter === 'past') {
      return isPast(dueDate);
    } else if (statusFilter === 'upcoming') {
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      return dueDate <= threeDaysFromNow && !isPast(dueDate);
    }

    return true;
  });

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bài tập này?')) {
      try {
        await deleteAssignment.mutateAsync(id);
      } catch (error) {
        console.error('Failed to delete assignment:', error);
      }
    }
    setMenuOpenId(null);
  };

  const getStatusBadge = (assignment: any) => {
    const dueDate = new Date(assignment.dueDate);
    const now = new Date();
    
    if (isPast(dueDate)) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
          Đã kết thúc
        </span>
      );
    }
    
    const hoursLeft = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursLeft <= 24) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-error-50 text-error-600 dark:bg-error-500/20 dark:text-error-500">
          Sắp hết hạn
        </span>
      );
    }
    
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-success-50 text-success-600 dark:bg-success-500/20 dark:text-success-500">
        Đang mở
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
          Bài tập
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Quản lý và theo dõi các bài tập
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-soft p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Tìm kiếm bài tập..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Class filter */}
          <div className="relative">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer min-w-[180px]"
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
              { key: 'active', label: 'Đang mở' },
              { key: 'upcoming', label: 'Sắp tới' },
              { key: 'past', label: 'Đã qua' },
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
            Tạo bài tập
          </button>
        </div>
      </div>

      {/* Assignments List */}
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
      ) : filteredAssignments.length === 0 ? (
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-soft p-12 text-center">
          <FileText className="w-16 h-16 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
            Không có bài tập nào
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            {searchQuery
              ? 'Không tìm thấy bài tập phù hợp với tìm kiếm của bạn'
              : 'Bắt đầu bằng cách tạo bài tập mới'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Tạo bài tập đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {filteredAssignments.map((assignment, index) => (
              <motion.div
                key={assignment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-neutral-800 rounded-2xl shadow-soft hover:shadow-soft-lg transition-all cursor-pointer group"
                onClick={() => navigate(`/assignments/${assignment.id}/submissions`)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                            {assignment.title}
                          </h3>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {assignment.class?.name}
                          </p>
                        </div>
                      </div>
                      
                      {assignment.description && (
                        <p className="text-neutral-600 dark:text-neutral-400 mb-4 line-clamp-2">
                          {assignment.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Hạn nộp: {format(new Date(assignment.dueDate), 'dd/MM/yyyy HH:mm', { locale: vi })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                          <Clock className="w-4 h-4" />
                          <span>
                            {isPast(new Date(assignment.dueDate))
                              ? 'Đã hết hạn'
                              : `Còn ${formatDistanceToNow(new Date(assignment.dueDate), { locale: vi })}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                          <Users className="w-4 h-4" />
                          <span>{assignment.submissionCount || 0} bài nộp</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {getStatusBadge(assignment)}
                      
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(menuOpenId === assignment.id ? null : assignment.id);
                          }}
                          className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-5 h-5 text-neutral-400" />
                        </button>

                        <AnimatePresence>
                          {menuOpenId === assignment.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 py-2 z-10"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  navigate(`/assignments/${assignment.id}/edit`);
                                  setMenuOpenId(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                              >
                                <Edit className="w-4 h-4" />
                                Chỉnh sửa
                              </button>
                              <button
                                onClick={() => handleDelete(String(assignment.id))}
                                className="w-full flex items-center gap-2 px-4 py-2 text-left text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10"
                              >
                                <Trash2 className="w-4 h-4" />
                                Xóa bài tập
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
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
