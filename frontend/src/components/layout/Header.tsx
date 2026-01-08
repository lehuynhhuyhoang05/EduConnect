import * as React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  Search,
  Bell,
  MessageSquare,
  Moon,
  Sun,
  Menu,
  Plus,
  ChevronDown,
  LogOut,
  User,
  Settings,
  Video,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/Dropdown';

interface HeaderProps {
  onMenuClick?: () => void;
  user?: {
    name: string;
    email: string;
    avatar?: string;
    role: 'student' | 'teacher' | 'admin';
  };
  notifications?: number;
  messages?: number;
  onLogout?: () => void;
}

const Header = ({ onMenuClick, user, notifications = 0, messages = 0, onLogout }: HeaderProps) => {
  const [isDark, setIsDark] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  const [searchFocused, setSearchFocused] = React.useState(false);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle('dark', newIsDark);
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-30 h-16',
        'bg-white/80 dark:bg-neutral-900/80',
        'backdrop-blur-xl',
        'border-b border-neutral-200 dark:border-neutral-800'
      )}
    >
      <div className="h-full px-4 flex items-center justify-between gap-4">
        {/* Left section */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Search */}
          <motion.div
            animate={{ width: searchFocused ? 400 : 280 }}
            transition={{ duration: 0.2 }}
            className="hidden md:block"
          >
            <Input
              placeholder="Tìm kiếm lớp học, bài tập..."
              leftIcon={<Search className="h-4 w-4" />}
              variant="default"
              inputSize="sm"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </motion.div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Quick actions for teachers */}
          {user?.role === 'teacher' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                  <span className="hidden sm:inline">Tạo mới</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Video className="h-4 w-4 mr-2" />
                  Phiên live mới
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Lớp học mới
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-neutral-600 dark:text-neutral-400"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {/* Messages */}
          <Link to="/messages">
            <Button
              variant="ghost"
              size="icon"
              className="relative text-neutral-600 dark:text-neutral-400"
            >
              <MessageSquare className="h-5 w-5" />
              {messages > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center bg-error-500 text-white text-xs rounded-full">
                  {messages > 9 ? '9+' : messages}
                </span>
              )}
            </Button>
          </Link>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-neutral-600 dark:text-neutral-400"
              >
                <Bell className="h-5 w-5" />
                {notifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center bg-error-500 text-white text-xs rounded-full">
                    {notifications > 9 ? '9+' : notifications}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                Thông báo
                {notifications > 0 && (
                  <Badge variant="primary" size="sm">{notifications} mới</Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Notification items */}
              <div className="max-h-64 overflow-y-auto">
                <DropdownMenuItem className="flex-col items-start gap-1 py-3">
                  <div className="flex items-center gap-2 w-full">
                    <div className="h-2 w-2 bg-primary-500 rounded-full" />
                    <span className="font-medium text-sm">Bài tập mới</span>
                    <span className="ml-auto text-xs text-neutral-500">5 phút trước</span>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 pl-4">
                    Giảng viên đã giao bài tập "Thực hành React" cho lớp Web Development
                  </p>
                </DropdownMenuItem>
                
                <DropdownMenuItem className="flex-col items-start gap-1 py-3">
                  <div className="flex items-center gap-2 w-full">
                    <div className="h-2 w-2 bg-success-500 rounded-full" />
                    <span className="font-medium text-sm">Điểm đã cập nhật</span>
                    <span className="ml-auto text-xs text-neutral-500">1 giờ trước</span>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 pl-4">
                    Bài kiểm tra "JavaScript Cơ bản" đã được chấm điểm
                  </p>
                </DropdownMenuItem>
              </div>
              
              <DropdownMenuSeparator />
              <DropdownMenuItem className="justify-center text-primary-600 dark:text-primary-400">
                Xem tất cả thông báo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                  <Avatar
                    src={user.avatar}
                    name={user.name}
                    size="sm"
                  />
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {user.name}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-neutral-500 hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{user.name}</span>
                    <span className="text-xs font-normal text-neutral-500">{user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="h-4 w-4 mr-2" />
                  Hồ sơ cá nhân
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Cài đặt
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} destructive>
                  <LogOut className="h-4 w-4 mr-2" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
};

export { Header };
