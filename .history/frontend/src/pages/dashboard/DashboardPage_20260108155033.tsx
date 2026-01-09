import { Link } from 'react-router-dom';
import {
  GraduationCap,
  FileText,
  Video,
  Bell,
  Clock,
  Users,
  TrendingUp,
  Calendar,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useClasses } from '@/hooks/useClasses';
import { useLiveSessions } from '@/hooks/useLiveSessions';
import { useNotifications } from '@/hooks/useNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/Avatar';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { formatRelativeTime } from '@/utils/formatters';
import { cn } from '@/utils/helpers';

export function DashboardPage() {
  const { user } = useAuth();
  const { data: classes, isLoading: classesLoading } = useClasses({ limit: 4 });
  const { data: sessions, isLoading: sessionsLoading } = useLiveSessions();
  const { data: notifications, isLoading: notificationsLoading } = useNotifications({ limit: 5 });

  const stats = [
    {
      name: 'Lớp học',
      value: classes?.total || 0,
      icon: GraduationCap,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-950',
    },
    {
      name: 'Bài tập',
      value: 12,
      icon: FileText,
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-950',
    },
    {
      name: 'Phiên học',
      value: sessions?.length || 0,
      icon: Video,
      color: 'text-purple-500',
      bgColor: 'bg-purple-100 dark:bg-purple-950',
    },
    {
      name: 'Thông báo',
      value: notifications?.unreadCount || 0,
      icon: Bell,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100 dark:bg-orange-950',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Xin chào, {user?.fullName?.split(' ').pop() || 'bạn'}! 👋
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Chào mừng bạn quay trở lại. Đây là tổng quan của bạn hôm nay.
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />}>
          Tạo lớp học
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center', stat.bgColor)}>
                  <stat.icon className={cn('h-6 w-6', stat.color)} />
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{stat.name}</p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Classes */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Lớp học của tôi
              </CardTitle>
              <Link to="/classes">
                <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="h-4 w-4" />}>
                  Xem tất cả
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {classesLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : classes?.data?.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {classes.data.map((cls) => (
                    <Link
                      key={cls.id}
                      to={`/classes/${cls.id}`}
                      className="group p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: cls.color || '#3B82F6' }}
                        >
                          {cls.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-neutral-900 dark:text-white truncate group-hover:text-primary-500 transition-colors">
                            {cls.name}
                          </h3>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                            {cls.subject || 'Chưa có môn học'}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Users className="h-4 w-4 text-neutral-400" />
                            <span className="text-xs text-neutral-500">
                              {cls.memberCount || 0} thành viên
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={GraduationCap}
                  title="Chưa có lớp học"
                  description="Bạn chưa tham gia lớp học nào. Hãy tạo hoặc tham gia một lớp học."
                  action={{
                    label: 'Tạo lớp học',
                    onClick: () => {},
                  }}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Sessions & Notifications */}
        <div className="space-y-6">
          {/* Upcoming Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Phiên học sắp tới
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} variant="text" className="h-16" />
                  ))}
                </div>
              ) : sessions?.length ? (
                <div className="space-y-3">
                  {sessions.slice(0, 3).map((session) => (
                    <Link
                      key={session.id}
                      to={`/live-sessions/${session.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
                        <Video className="h-5 w-5 text-purple-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-neutral-900 dark:text-white truncate">
                          {session.title}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-neutral-500">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(session.scheduledAt)}
                        </div>
                      </div>
                      {session.status === 'live' && (
                        <Badge color="red" dot>Live</Badge>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Video}
                  title="Không có phiên học"
                  description="Chưa có phiên học nào được lên lịch."
                />
              )}
            </CardContent>
          </Card>

          {/* Recent Notifications */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Thông báo
              </CardTitle>
              <Link to="/notifications">
                <Button variant="ghost" size="sm">
                  Xem tất cả
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {notificationsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} variant="text" className="h-12" />
                  ))}
                </div>
              ) : notifications?.data?.length ? (
                <div className="space-y-2">
                  {notifications.data.slice(0, 4).map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        'p-3 rounded-xl text-sm',
                        notification.read
                          ? 'bg-neutral-50 dark:bg-neutral-800/50'
                          : 'bg-primary-50 dark:bg-primary-950'
                      )}
                    >
                      <p className="text-neutral-900 dark:text-white line-clamp-2">
                        {notification.title}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Bell}
                  title="Không có thông báo"
                  description="Bạn đã xem hết thông báo."
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
