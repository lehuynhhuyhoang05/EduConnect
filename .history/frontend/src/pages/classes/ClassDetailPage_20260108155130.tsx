import { useState } from 'react';
import { useParams, Link, Outlet, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  FileText,
  Video,
  Settings,
  MessageSquare,
  Megaphone,
  Copy,
  Check,
} from 'lucide-react';
import { useClass, useClassMembers } from '@/hooks/useClasses';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn, getInitials } from '@/utils/helpers';
import { UserRole } from '@/types/user.types';

export function ClassDetailPage() {
  const { classId } = useParams<{ classId: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const { data: classData, isLoading } = useClass(classId!);
  const { data: members } = useClassMembers(classId!);

  const [copied, setCopied] = useState(false);

  const isOwner = classData?.ownerId === user?.id;
  const isTeacher = user?.role === UserRole.TEACHER;

  const tabs = [
    { value: 'stream', label: 'Bảng tin', icon: Megaphone, href: '' },
    { value: 'assignments', label: 'Bài tập', icon: FileText, href: '/assignments' },
    { value: 'members', label: 'Thành viên', icon: Users, href: '/members' },
    { value: 'sessions', label: 'Phiên học', icon: Video, href: '/sessions' },
  ];

  const getCurrentTab = () => {
    const path = location.pathname.replace(`/classes/${classId}`, '');
    if (path === '' || path === '/') return 'stream';
    return path.replace('/', '');
  };

  const copyClassCode = async () => {
    if (classData?.classCode) {
      await navigator.clipboard.writeText(classData.classCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
          Không tìm thấy lớp học
        </h2>
        <p className="text-neutral-500 mt-2">Lớp học này không tồn tại hoặc bạn không có quyền truy cập.</p>
        <Link to="/classes">
          <Button variant="outline" className="mt-4">
            Quay lại danh sách lớp
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ backgroundColor: classData.color || '#3B82F6' }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
        <div className="relative p-6 sm:p-8">
          <Link
            to="/classes"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {classData.name}
              </h1>
              {classData.subject && (
                <p className="text-white/80 mt-1">{classData.subject}</p>
              )}
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-white/80">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">{members?.length || 0} thành viên</span>
                </div>
                {classData.classCode && (
                  <button
                    onClick={copyClassCode}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm transition-colors"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    <span className="font-mono">{classData.classCode}</span>
                  </button>
                )}
              </div>
            </div>

            {isOwner && (
              <Link to={`/classes/${classId}/settings`}>
                <Button variant="secondary" leftIcon={<Settings className="h-4 w-4" />}>
                  Cài đặt
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={getCurrentTab()} className="w-full">
        <TabsList variant="underline" className="w-full justify-start">
          {tabs.map((tab) => (
            <Link key={tab.value} to={`/classes/${classId}${tab.href}`}>
              <TabsTrigger value={tab.value} variant="underline" className="gap-2">
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            </Link>
          ))}
        </TabsList>
      </Tabs>

      {/* Tab Content */}
      <Outlet context={{ classData, members, isOwner, isTeacher }} />
    </div>
  );
}
