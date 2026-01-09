import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Bell,
  Moon,
  Sun,
  Menu,
  X,
  Settings,
  LogOut,
  User,
} from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useUIStore, Theme } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/Avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Badge } from '@/components/ui/Badge';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { theme, setTheme, sidebarCollapsed } = useUIStore();
  const { user, logout } = useAuthStore();
  const [searchOpen, setSearchOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleTheme = () => {
    const themes: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-30 h-16 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800 transition-all duration-300',
        sidebarCollapsed ? 'ml-20' : 'ml-64'
      )}
    >
      <div className="h-full px-6 flex items-center justify-between gap-4">
        {/* Left side - Title */}
        <div className="flex items-center gap-4">
          {title && (
            <div>
              <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className={cn('relative', searchOpen ? 'w-64' : 'w-auto')}>
            {searchOpen ? (
              <div className="relative animate-in slide-in-from-right-4 fade-in-0">
                <Input
                  type="search"
                  placeholder="Tìm kiếm..."
                  className="pr-10"
                  autoFocus
                  onBlur={() => setSearchOpen(false)}
                />
                <button
                  onClick={() => setSearchOpen(false)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Custom Actions */}
          {actions}

          {/* Theme Toggle */}
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === 'dark' ? (
              <Moon className="h-5 w-5" />
            ) : theme === 'light' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </Button>

          {/* Notifications */}
          <Link to="/notifications">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
            </Button>
          </Link>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                <Avatar size="sm" status="online">
                  <AvatarImage src={user?.avatar} alt={user?.fullName} />
                  <AvatarFallback>
                    {user?.fullName ? getInitials(user.fullName) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-semibold">{user?.fullName}</span>
                  <span className="text-xs text-neutral-500">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Hồ sơ cá nhân
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Cài đặt
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="flex items-center gap-2 text-red-600 dark:text-red-400"
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
