import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Users,
  FileText,
  Video,
  TrendingUp,
  Clock,
  Calendar,
  ArrowRight,
  Play,
  CheckCircle2,
  AlertCircle,
  Star,
  Loader2,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress, CircularProgress } from '@/components/ui/Progress';
import {
  useCurrentUser,
  useMyClasses,
  useUpcomingAssignments,
  useUpcomingSessions,
  useNotifications,
} from '@/hooks';
import type { Class, Assignment, LiveSession } from '@/types';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: classesData, isLoading: classesLoading } = useMyClasses();
  const { data: assignmentsData, isLoading: assignmentsLoading } = useUpcomingAssignments();
  const { data: sessionsData, isLoading: sessionsLoading } = useUpcomingSessions();
  const { data: notificationsData } = useNotifications();

  const classes = (classesData as { data?: Class[] })?.data || classesData as Class[] || [];
  const assignments = (assignmentsData as Assignment[]) || [];
  const sessions = (sessionsData as { data?: LiveSession[] })?.data || (sessionsData as LiveSession[]) || [];
  const unreadNotifications = (notificationsData as { unread?: number })?.unread || (Array.isArray(notificationsData) ? notificationsData.filter((n: Notification) => !n.isRead).length : 0);

  // Calculate stats
  const stats = React.useMemo(() => [
    {
      label: 'Lớp học',
      value: classes.length,
      change: classes.length > 0 ? `${classes.length} lớp` : 'Chưa có',
      changeType: classes.length > 0 ? 'positive' : 'neutral',
      icon: BookOpen,
      color: 'from-primary-500 to-primary-600',
      bgColor: 'bg-primary-100 dark:bg-primary-900/30',
      textColor: 'text-primary-600 dark:text-primary-400',
    },
    {
      label: 'Học viên',
      value: classes.reduce((acc: number, c: Class) => acc + (c.membersCount || c._count?.members || 0), 0),
      change: '+0',
      changeType: 'neutral',
      icon: Users,
      color: 'from-secondary-500 to-secondary-600',
      bgColor: 'bg-secondary-100 dark:bg-secondary-900/30',
      textColor: 'text-secondary-600 dark:text-secondary-400',
    },
    {
      label: 'Bài tập',
      value: assignments.length,
      change: `${assignments.filter((a: Assignment) => a.isActive).length} đang mở`,
      changeType: 'neutral',
      icon: FileText,
      color: 'from-warning-500 to-warning-600',
      bgColor: 'bg-warning-100 dark:bg-warning-900/30',
      textColor: 'text-warning-600 dark:text-warning-400',
    },
    {
      label: 'Phiên live',
      value: sessions.length,
      change: `${sessions.filter((s: LiveSession) => s.status === 'live').length} đang diễn ra`,
      changeType: sessions.some((s: LiveSession) => s.status === 'live') ? 'positive' : 'neutral',
      icon: Video,
      color: 'from-success-500 to-success-600',
      bgColor: 'bg-success-100 dark:bg-success-900/30',
      textColor: 'text-success-600 dark:text-success-400',
    },
  ], [classes, assignments, sessions]);

  const isLoading = userLoading || classesLoading || assignmentsLoading || sessionsLoading;

  if (isLoading) {
    return (
      <PageContainer title="Dashboard" description="Đang tải...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={`Xin chào, ${user?.name || user?.fullName || 'Bạn'}! 👋`}
      description="Đây là tổng quan hoạt động của bạn hôm nay"
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.div key={stat.label} variants={itemVariants}>
                <Card variant="elevated" className="overflow-hidden group hover:shadow-soft-xl transition-shadow">
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div className={cn('p-2.5 rounded-xl', stat.bgColor)}>
                        <Icon className={cn('h-5 w-5', stat.textColor)} />
                      </div>
                      <Badge
                        variant={stat.changeType === 'positive' ? 'success' : 'default'}
                        size="sm"
                      >
                        {stat.change}
                      </Badge>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                        {stat.value}
                      </h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                        {stat.label}
                      </p>
                    </div>
                  </div>
                  {/* Gradient bar at bottom */}
                  <div className={cn('h-1 bg-gradient-to-r', stat.color)} />
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Sessions */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <Card variant="elevated" padding="none">
              <CardHeader className="p-5 pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary-600" />
                    Phiên học sắp tới
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                    onClick={() => navigate('/live-sessions')}
                  >
                    Xem tất cả
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {sessions.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500">
                    Không có phiên học nào sắp tới
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sessions.slice(0, 3).map((session: LiveSession) => (
                      <motion.div
                        key={session.id}
                        whileHover={{ x: 4 }}
                        onClick={() => navigate(`/live-sessions/${session.id}`)}
                        className={cn(
                          'flex items-center gap-4 p-4 rounded-xl',
                          'bg-neutral-50 dark:bg-neutral-800/50',
                          'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                          'transition-colors cursor-pointer'
                        )}
                      >
                        <div
                          className={cn(
                            'h-12 w-12 rounded-xl flex items-center justify-center',
                            session.status === 'live'
                              ? 'bg-gradient-to-br from-error-500 to-error-600'
                              : 'bg-gradient-to-br from-primary-500 to-primary-600'
                          )}
                        >
                          {session.status === 'live' ? (
                            <Play className="h-5 w-5 text-white" />
                          ) : (
                            <Video className="h-5 w-5 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                              {session.title}
                            </h4>
                            {session.status === 'live' && (
                              <Badge variant="error" size="sm" className="animate-pulse">
                                LIVE
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">
                            {session.scheduledAt ? new Date(session.scheduledAt).toLocaleDateString('vi-VN') : 'N/A'} •{' '}
                            {session.scheduledAt ? new Date(session.scheduledAt).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            }) : ''}
                          </p>
                        </div>
                        <div className="hidden sm:flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-sm text-neutral-500">
                            <Users className="h-4 w-4" />
                            {session.participantsCount || session._count?.participants || 0}
                          </div>
                        </div>
                        {session.status === 'live' && (
                          <Button size="sm" variant="primary">
                            Tham gia
                          </Button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Stats */}
          <motion.div variants={itemVariants}>
            <Card variant="elevated" className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-success-500" />
                  Tiến độ tuần này
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Weekly progress circle */}
                <div className="flex items-center justify-center">
                  <CircularProgress
                    value={assignments.length > 0 ? 
                      Math.round((assignments.filter((a: Assignment) => !a.isActive).length / assignments.length) * 100) : 0}
                    size={140}
                    strokeWidth={10}
                    color="primary"
                  >
                    <div className="text-center">
                      <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {assignments.length > 0 ? 
                          Math.round((assignments.filter((a: Assignment) => !a.isActive).length / assignments.length) * 100) : 0}%
                      </span>
                      <p className="text-xs text-neutral-500">Hoàn thành</p>
                    </div>
                  </CircularProgress>
                </div>

                {/* Progress items */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-neutral-600 dark:text-neutral-400">Lớp học đã tham gia</span>
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">{classes.length}</span>
                    </div>
                    <Progress value={Math.min(classes.length * 10, 100)} variant="gradient" size="sm" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-neutral-600 dark:text-neutral-400">Bài tập chưa nộp</span>
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">
                        {assignments.filter((a: Assignment) => a.isActive).length}
                      </span>
                    </div>
                    <Progress 
                      value={assignments.length > 0 ? 
                        ((assignments.length - assignments.filter((a: Assignment) => a.isActive).length) / assignments.length) * 100 : 100} 
                      variant="gradient" 
                      size="sm" 
                      color="success" 
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-neutral-600 dark:text-neutral-400">Thông báo chưa đọc</span>
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">{unreadNotifications}</span>
                    </div>
                    <Progress value={unreadNotifications > 0 ? 50 : 100} variant="gradient" size="sm" color="warning" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Second row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Assignments */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <Card variant="elevated" padding="none">
              <CardHeader className="p-5 pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-warning-500" />
                    Bài tập gần đây
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                    onClick={() => navigate('/assignments')}
                  >
                    Xem tất cả
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {assignments.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500">
                    Chưa có bài tập nào
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assignments.slice(0, 5).map((assignment: Assignment) => (
                      <motion.div
                        key={assignment.id}
                        whileHover={{ x: 4 }}
                        onClick={() => navigate(`/assignments/${assignment.id}`)}
                        className={cn(
                          'flex items-center gap-4 p-4 rounded-xl',
                          'bg-neutral-50 dark:bg-neutral-800/50',
                          'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                          'transition-colors cursor-pointer'
                        )}
                      >
                        <div
                          className={cn(
                            'h-10 w-10 rounded-lg flex items-center justify-center',
                            !assignment.isActive && 'bg-success-100 dark:bg-success-900/30',
                            assignment.isActive && new Date(assignment.dueDate) > new Date() && 'bg-warning-100 dark:bg-warning-900/30',
                            assignment.isActive && new Date(assignment.dueDate) <= new Date() && 'bg-error-100 dark:bg-error-900/30'
                          )}
                        >
                          {!assignment.isActive ? (
                            <CheckCircle2 className="h-5 w-5 text-success-600" />
                          ) : new Date(assignment.dueDate) > new Date() ? (
                            <Clock className="h-5 w-5 text-warning-600" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-error-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                            {assignment.title}
                          </h4>
                          <p className="text-sm text-neutral-500 mt-0.5">
                            Hạn: {new Date(assignment.dueDate).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                        <Badge
                          variant={
                            !assignment.isActive ? 'success' :
                            new Date(assignment.dueDate) > new Date() ? 'warning' : 'error'
                          }
                          size="sm"
                        >
                          {!assignment.isActive ? 'Đã đóng' :
                           new Date(assignment.dueDate) > new Date() ? 'Đang mở' : 'Quá hạn'}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* My Classes */}
          <motion.div variants={itemVariants}>
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-warning-500" />
                  Lớp học của tôi
                </CardTitle>
              </CardHeader>
              <CardContent>
                {classes.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500">
                    Chưa tham gia lớp học nào
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => navigate('/classes')}
                    >
                      Tham gia lớp học
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {classes.slice(0, 5).map((cls: Class, index: number) => (
                      <motion.div
                        key={cls.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => navigate(`/classes/${cls.id}`)}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
                      >
                        <div
                          className={cn(
                            'h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold',
                            'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                          )}
                        >
                          {cls.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                            {cls.name}
                          </p>
                          <p className="text-xs text-neutral-500 truncate">
                            {cls.membersCount || cls._count?.members || 0} thành viên
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </PageContainer>
  );
};

export default DashboardPage;
