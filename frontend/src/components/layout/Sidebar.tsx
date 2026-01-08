import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  BookOpen,
  Video,
  FileText,
  Bell,
  Settings,
  Users,
  Calendar,
  BarChart3,
  MessageSquare,
  HelpCircle,
  ChevronLeft,
  GraduationCap,
  Folder,
  LogOut,
} from 'lucide-react';
import { useLogout } from '@/hooks';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/Tooltip';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  user?: {
    name: string;
    email: string;
    avatar?: string;
    role: 'student' | 'teacher' | 'admin';
  };
}

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
  roles?: ('student' | 'teacher' | 'admin')[];
}

const mainNavItems: NavItem[] = [
  { icon: Home, label: 'Trang chủ', href: '/dashboard' },
  { icon: BookOpen, label: 'Lớp học', href: '/classes' },
  { icon: Video, label: 'Phiên live', href: '/live-sessions' },
  { icon: FileText, label: 'Bài tập', href: '/assignments' },
  { icon: Folder, label: 'Tài liệu', href: '/materials' },
  { icon: Calendar, label: 'Lịch học', href: '/calendar' },
  { icon: MessageSquare, label: 'Tin nhắn', href: '/messages', badge: 3 },
];

const teacherNavItems: NavItem[] = [
  { icon: Users, label: 'Học viên', href: '/students', roles: ['teacher', 'admin'] },
  { icon: BarChart3, label: 'Báo cáo', href: '/reports', roles: ['teacher', 'admin'] },
  { icon: GraduationCap, label: 'Điểm số', href: '/gradebook', roles: ['teacher', 'admin'] },
];

const bottomNavItems: NavItem[] = [
  { icon: Bell, label: 'Thông báo', href: '/notifications', badge: 5 },
  { icon: Settings, label: 'Cài đặt', href: '/settings' },
  { icon: HelpCircle, label: 'Hỗ trợ', href: '/help' },
];

const Sidebar = ({ isCollapsed = false, onToggleCollapse, user }: SidebarProps) => {
  const location = useLocation();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    const Icon = item.icon;

    const linkContent = (
      <Link
        to={item.href}
        className={cn(
          'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl',
          'transition-all duration-200',
          active
            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
        )}
      >
        {/* Active indicator */}
        {active && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-600 rounded-r-full"
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        )}

        <Icon className={cn('h-5 w-5 shrink-0', active && 'text-primary-600 dark:text-primary-400')} />
        
        <AnimatePresence>
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="font-medium truncate"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>

        {item.badge && !isCollapsed && (
          <Badge variant="error" size="sm" className="ml-auto">
            {item.badge}
          </Badge>
        )}

        {item.badge && isCollapsed && (
          <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center bg-error-500 text-white text-xs rounded-full">
            {item.badge}
          </span>
        )}
      </Link>
    );

    if (isCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.label}
            {item.badge && (
              <Badge variant="error" size="sm">
                {item.badge}
              </Badge>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  const filteredTeacherItems = teacherNavItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <TooltipProvider>
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 72 : 260 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={cn(
          'fixed left-0 top-0 z-40 h-screen',
          'bg-white dark:bg-neutral-900',
          'border-r border-neutral-200 dark:border-neutral-800',
          'flex flex-col'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-200 dark:border-neutral-800">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="font-bold text-lg text-neutral-900 dark:text-neutral-100"
                >
                  EduLMS
                </motion.span>
              )}
            </AnimatePresence>
          </Link>

          {!isCollapsed && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggleCollapse}
              className="text-neutral-500"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto scrollbar-hide">
          {/* Main Navigation */}
          <div className="space-y-1">
            {!isCollapsed && (
              <span className="px-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Menu chính
              </span>
            )}
            <div className="space-y-1 mt-2">
              {mainNavItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </div>

          {/* Teacher/Admin Navigation */}
          {filteredTeacherItems.length > 0 && (
            <div className="space-y-1">
              {!isCollapsed && (
                <span className="px-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Quản lý
                </span>
              )}
              <div className="space-y-1 mt-2">
                {filteredTeacherItems.map((item) => (
                  <NavLink key={item.href} item={item} />
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Bottom Navigation */}
        <div className="px-3 py-4 border-t border-neutral-200 dark:border-neutral-800 space-y-1">
          {bottomNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        {/* User Profile */}
        {user && (
          <div className="px-3 py-4 border-t border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <Link
                to="/profile"
                className={cn(
                  'flex-1 flex items-center gap-3 p-2 rounded-xl',
                  'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                  'transition-colors duration-200'
                )}
              >
                <Avatar
                  src={user.avatar}
                  name={user.name}
                  size="sm"
                  showStatus
                  status="online"
                />
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="flex-1 min-w-0"
                    >
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {user.role === 'teacher' ? 'Giảng viên' : user.role === 'admin' ? 'Quản trị viên' : 'Học viên'}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Link>
              {!isCollapsed && (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={handleLogout}
                      disabled={logoutMutation.isPending}
                      className="text-neutral-500 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Đăng xuất</TooltipContent>
                </Tooltip>
              )}
            </div>
            {isCollapsed && (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                    className="w-full mt-2 text-neutral-500 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Đăng xuất</TooltipContent>
              </Tooltip>
            )}
          </div>
        )}

        {/* Collapse button for collapsed state */}
        {isCollapsed && (
          <div className="px-3 py-4 border-t border-neutral-200 dark:border-neutral-800">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="w-full text-neutral-500"
            >
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </Button>
          </div>
        )}
      </motion.aside>
    </TooltipProvider>
  );
};

export { Sidebar };
