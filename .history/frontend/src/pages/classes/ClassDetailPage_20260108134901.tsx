import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Users,
  FileText,
  Video,
  MessageSquare,
  Settings,
  Plus,
  Calendar,
  Clock,
} from 'lucide-react';
import { useClass, useClassMembers } from '../../hooks/useClasses';
import { useAssignmentsByClass } from '../../hooks/useAssignments';
import { useLiveSessionsByClass } from '../../hooks/useLiveSessions';
import { useAuthStore } from '../../store';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

type TabType = 'stream' | 'assignments' | 'members' | 'materials';

export function ClassDetailPage() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('stream');

  const { data: classData, isLoading: classLoading } = useClass(classId || '');
  const { data: members } = useClassMembers(classId || '');
  const { data: assignments } = useAssignmentsByClass(classId || '');
  const { data: sessions } = useLiveSessionsByClass(classId || '');

  const isTeacher = classData?.teacherId === user?.id;

  if (classLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            Không tìm thấy lớp học
          </h2>
          <button
            onClick={() => navigate('/classes')}
            className="text-primary-600 hover:underline"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'stream', label: 'Bảng tin', icon: MessageSquare },
    { key: 'assignments', label: 'Bài tập', icon: FileText },
    { key: 'members', label: 'Thành viên', icon: Users },
    { key: 'materials', label: 'Tài liệu', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-500 to-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate('/classes')}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Quay lại
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{classData.name}</h1>
              {classData.description && (
                <p className="text-white/80 mb-4">{classData.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>{members?.length || 0} thành viên</span>
                </div>
                <div className="px-2 py-1 bg-white/20 rounded-lg">
                  Mã lớp: {classData.code}
                </div>
              </div>
            </div>

            {isTeacher && (
              <button
                onClick={() => navigate(`/classes/${classId}/settings`)}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 border-b border-white/20">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'text-white border-b-2 border-white'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'stream' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left sidebar */}
            <div className="space-y-6">
              {/* Upcoming Sessions */}
              <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-soft p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-neutral-900 dark:text-white">
                    Phiên học sắp tới
                  </h3>
                  {isTeacher && (
                    <button className="text-primary-600 hover:text-primary-700">
                      <Plus className="w-5 h-5" />
                    </button>
                  )}
                </div>
                {sessions?.filter((s) => s.status === 'scheduled').length === 0 ? (
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                    Chưa có phiên học nào
                  </p>
                ) : (
                  <div className="space-y-3">
                    {sessions?.filter((s) => s.status === 'scheduled').slice(0, 3).map((session) => (
                      <div
                        key={session.id}
                        className="p-3 bg-neutral-50 dark:bg-neutral-700 rounded-xl cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-600 transition-colors"
                        onClick={() => navigate(`/live-session/${session.id}`)}
                      >
                        <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 mb-1">
                          <Video className="w-4 h-4" />
                          <span className="font-medium text-sm">{session.title}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(session.startTime), 'dd/MM')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(session.startTime), 'HH:mm')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Links */}
              <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-soft p-6">
                <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">
                  Liên kết nhanh
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setActiveTab('assignments')}
                    className="w-full flex items-center gap-3 p-3 text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-xl transition-colors"
                  >
                    <FileText className="w-5 h-5 text-primary-500" />
                    <span>Xem tất cả bài tập</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('members')}
                    className="w-full flex items-center gap-3 p-3 text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-xl transition-colors"
                  >
                    <Users className="w-5 h-5 text-secondary-500" />
                    <span>Danh sách thành viên</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Announcements */}
              <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-soft p-6">
                <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">
                  Thông báo gần đây
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400">
                  Chưa có thông báo nào
                </p>
              </div>

              {/* Recent Assignments */}
              <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-soft p-6">
                <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">
                  Bài tập gần đây
                </h3>
                {assignments?.length === 0 ? (
                  <p className="text-neutral-500 dark:text-neutral-400">
                    Chưa có bài tập nào
                  </p>
                ) : (
                  <div className="space-y-3">
                    {assignments?.slice(0, 5).map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-700 rounded-xl cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-600 transition-colors"
                        onClick={() => navigate(`/assignments/${assignment.id}/submissions`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div>
                            <h4 className="font-medium text-neutral-900 dark:text-white">
                              {assignment.title}
                            </h4>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                              Hạn nộp: {format(new Date(assignment.dueDate), 'dd/MM/yyyy HH:mm', { locale: vi })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assignments' && (
          <div className="space-y-4">
            {isTeacher && (
              <div className="flex justify-end">
                <button
                  onClick={() => navigate(`/assignments/create?classId=${classId}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Tạo bài tập
                </button>
              </div>
            )}

            {assignments?.length === 0 ? (
              <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-soft p-12 text-center">
                <FileText className="w-16 h-16 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                  Chưa có bài tập nào
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400">
                  {isTeacher ? 'Tạo bài tập đầu tiên cho lớp học' : 'Giáo viên chưa giao bài tập'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {assignments?.map((assignment) => (
                  <motion.div
                    key={assignment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-neutral-800 rounded-2xl shadow-soft p-6 cursor-pointer hover:shadow-soft-lg transition-all"
                    onClick={() => navigate(`/assignments/${assignment.id}/submissions`)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
                          {assignment.title}
                        </h3>
                        {assignment.description && (
                          <p className="text-neutral-600 dark:text-neutral-400 line-clamp-2 mb-2">
                            {assignment.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
                          <span>
                            Hạn nộp: {format(new Date(assignment.dueDate), 'dd/MM/yyyy HH:mm', { locale: vi })}
                          </span>
                          <span>{assignment.submissionCount || 0} bài nộp</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-soft p-6">
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">
              Danh sách thành viên ({members?.length || 0})
            </h3>
            <div className="space-y-3">
              {/* Teacher */}
              {classData.teacher && (
                <div className="flex items-center gap-3 p-3 bg-primary-50 dark:bg-primary-500/10 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold">
                    {classData.teacher.name[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {classData.teacher.name}
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {classData.teacher.email}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-primary-500 text-white text-xs font-medium rounded-lg">
                    Giáo viên
                  </span>
                </div>
              )}

              {/* Students */}
              {members?.filter((m) => m.userId !== classData.teacherId).map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-700 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-neutral-300 dark:bg-neutral-600 flex items-center justify-center text-neutral-700 dark:text-neutral-300 font-semibold">
                    {member.user.name[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {member.user.name}
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {member.user.email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'materials' && (
          <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-soft p-12 text-center">
            <FileText className="w-16 h-16 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
              Chưa có tài liệu nào
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              Tài liệu học tập sẽ được hiển thị ở đây
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
