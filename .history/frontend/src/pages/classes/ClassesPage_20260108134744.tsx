import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Users,
  BookOpen,
  MoreVertical,
  Edit,
  Trash2,
  LogOut,
  Copy,
  Settings,
} from 'lucide-react';
import { useMyClasses, useCreateClass, useDeleteClass, useJoinClass } from '../../hooks/useClasses';
import { useAuthStore } from '../../store';
import { Modal, Button, Input } from '../../components/ui';

export function ClassesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Form state
  const [newClassName, setNewClassName] = useState('');
  const [newClassDescription, setNewClassDescription] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const { data: classes, isLoading } = useMyClasses();
  const createClass = useCreateClass();
  const deleteClass = useDeleteClass();
  const joinClass = useJoinClass();

  const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN';

  // Filter classes
  const filteredClasses = classes?.filter((cls) =>
    cls.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleCreateClass = async () => {
    if (!newClassName.trim()) return;

    try {
      await createClass.mutateAsync({
        name: newClassName,
        description: newClassDescription,
      });
      setShowCreateModal(false);
      setNewClassName('');
      setNewClassDescription('');
    } catch (error) {
      console.error('Failed to create class:', error);
    }
  };

  const handleJoinClass = async () => {
    if (!joinCode.trim()) return;

    try {
      await joinClass.mutateAsync({ code: joinCode });
      setShowJoinModal(false);
      setJoinCode('');
    } catch (error) {
      console.error('Failed to join class:', error);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa lớp học này?')) {
      try {
        await deleteClass.mutateAsync(id);
      } catch (error) {
        console.error('Failed to delete class:', error);
      }
    }
    setMenuOpenId(null);
  };

  const copyClassCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setMenuOpenId(null);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
          Lớp học của tôi
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Quản lý và tham gia các lớp học
        </p>
      </div>

      {/* Actions */}
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-soft p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Tìm kiếm lớp học..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-neutral-900 dark:text-white"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowJoinModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-secondary-500 text-white rounded-xl font-medium hover:bg-secondary-600 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Tham gia lớp
            </button>

            {isTeacher && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Tạo lớp học
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Classes Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-neutral-800 rounded-2xl p-6 animate-pulse">
              <div className="h-32 bg-neutral-200 dark:bg-neutral-700 rounded-xl mb-4" />
              <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-2/3 mb-2" />
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-soft p-12 text-center">
          <BookOpen className="w-16 h-16 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
            Chưa có lớp học nào
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            {isTeacher
              ? 'Tạo lớp học đầu tiên để bắt đầu giảng dạy'
              : 'Tham gia lớp học bằng mã lớp từ giáo viên'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-6 py-3 bg-secondary-500 text-white rounded-xl font-medium hover:bg-secondary-600 transition-colors"
            >
              Tham gia lớp
            </button>
            {isTeacher && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
              >
                Tạo lớp học
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredClasses.map((cls, index) => (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-neutral-800 rounded-2xl shadow-soft hover:shadow-soft-lg transition-all cursor-pointer group overflow-hidden"
                onClick={() => navigate(`/classes/${cls.id}`)}
              >
                {/* Cover Image */}
                <div className="h-32 bg-gradient-to-br from-primary-500 to-primary-600 relative">
                  {cls.coverImage && (
                    <img
                      src={cls.coverImage}
                      alt={cls.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  
                  {/* Menu */}
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === cls.id ? null : cls.id);
                      }}
                      className="p-2 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-colors"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    <AnimatePresence>
                      {menuOpenId === cls.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 py-2 z-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => copyClassCode(cls.code)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                          >
                            <Copy className="w-4 h-4" />
                            Sao chép mã lớp
                          </button>
                          {cls.teacherId === user?.id && (
                            <>
                              <button
                                onClick={() => {
                                  navigate(`/classes/${cls.id}/settings`);
                                  setMenuOpenId(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                              >
                                <Settings className="w-4 h-4" />
                                Cài đặt lớp
                              </button>
                              <button
                                onClick={() => handleDeleteClass(cls.id)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-left text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10"
                              >
                                <Trash2 className="w-4 h-4" />
                                Xóa lớp học
                              </button>
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {cls.name}
                  </h3>
                  {cls.description && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 mb-3">
                      {cls.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                      <Users className="w-4 h-4" />
                      <span>{cls.studentCount || 0} học sinh</span>
                    </div>
                    <span className="px-2 py-1 bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 rounded-lg text-xs font-medium">
                      {cls.code}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Class Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Tạo lớp học mới"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Tên lớp học
            </label>
            <Input
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="VD: Lập trình Web K66"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Mô tả (tùy chọn)
            </label>
            <textarea
              value={newClassDescription}
              onChange={(e) => setNewClassDescription(e.target.value)}
              placeholder="Mô tả ngắn về lớp học..."
              rows={3}
              className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-neutral-900 dark:text-white resize-none"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreateClass} disabled={createClass.isPending}>
              {createClass.isPending ? 'Đang tạo...' : 'Tạo lớp'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Join Class Modal */}
      <Modal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        title="Tham gia lớp học"
      >
        <div className="space-y-4">
          <p className="text-neutral-600 dark:text-neutral-400">
            Nhập mã lớp học được cung cấp bởi giáo viên để tham gia.
          </p>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Mã lớp học
            </label>
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="VD: ABC123"
              className="text-center text-2xl tracking-wider font-mono"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setShowJoinModal(false)}>
              Hủy
            </Button>
            <Button onClick={handleJoinClass} disabled={joinClass.isPending}>
              {joinClass.isPending ? 'Đang tham gia...' : 'Tham gia'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
