import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  FileText,
  Video,
  MessageSquare,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
} from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/Avatar';
import { SimpleTooltip } from '@/components/ui/Tooltip';
import { Button } from '@/components/ui/Button';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Lớp học', href: '/classes', icon: GraduationCap },
  { name: 'Bài tập', href: '/assignments', icon: FileText },
  { name: 'Phiên học', href: '/live-sessions', icon: Video },
  { name: 'Tin nhắn', href: '/chat', icon: MessageSquare },
  { name: 'Thông báo', href: '/notifications', icon: Bell },
];

const bottomNavigation = [
  { name: 'Cài đặt', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { user, logout } = useAuthStore();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 transition-all duration-300 flex flex-col',
        sidebarCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-200 dark:border-neutral-800">
        {!sidebarCollapsed && (
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl text-neutral-900 dark:text-white">
              LMS
            </span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn(sidebarCollapsed && 'mx-auto')}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          const Icon = item.icon;

          const NavLink = (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white',
                sidebarCollapsed && 'justify-center px-2'
              )}
            >
              <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary-500')} />
              {!sidebarCollapsed && <span>{item.name}</span>}
            </Link>
          );

          if (sidebarCollapsed) {
            return (
              <SimpleTooltip key={item.name} content={item.name} side="right">
                {NavLink}
              </SimpleTooltip>
            );
          }

          return NavLink;
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="px-3 py-4 border-t border-neutral-200 dark:border-neutral-800 space-y-1">
        {bottomNavigation.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          const Icon = item.icon;

          const NavLink = (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white',
                sidebarCollapsed && 'justify-center px-2'
              )}
            >
              <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary-500')} />
              {!sidebarCollapsed && <span>{item.name}</span>}
            </Link>
          );

          if (sidebarCollapsed) {
            return (
              <SimpleTooltip key={item.name} content={item.name} side="right">
                {NavLink}
              </SimpleTooltip>
            );
          }

          return NavLink;
        })}
      </div>

      {/* User Profile */}
      <div className="p-3 border-t border-neutral-200 dark:border-neutral-800">
        <div
          className={cn(
            'flex items-center gap-3 p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer',
            sidebarCollapsed && 'justify-center'
          )}
        >
          <Avatar size="sm" status="online">
            <AvatarImage src={user?.avatar} alt={user?.fullName} />
            <AvatarFallback>{user?.fullName ? getInitials(user.fullName) : 'U'}</AvatarFallback>
          </Avatar>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                {user?.fullName || 'User'}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                {user?.email}
              </p>
            </div>
          )}
          {!sidebarCollapsed && (
            <SimpleTooltip content="Đăng xuất">
              <button
                onClick={logout}
                className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              >
                <LogOut className="h-4 w-4 text-neutral-500" />
              </button>
            </SimpleTooltip>
          )}
        </div>
      </div>
    </aside>
  );
}
