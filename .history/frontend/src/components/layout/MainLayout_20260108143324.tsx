import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Video,
  GraduationCap,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  ChevronDown,
  User,
} from 'lucide-react';
import { useAuthStore, useThemeStore } from '../../store';
import { useLogout } from '../../hooks/useAuth';
import { useUnreadNotificationCount } from '../../hooks/useNotifications';

const navItems = [
  { path: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { path: '/classes', label: 'Lớp học', icon: BookOpen },
  { path: '/assignments', label: 'Bài tập', icon: FileText },
  { path: '/live-sessions', label: 'Phiên học', icon: Video },
  { path: '/grades', label: 'Điểm số', icon: GraduationCap },
];

export function MainLayout() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const logout = useLogout();
  const { data: unreadCount } = useUnreadNotificationCount();

  const handleLogout = async () => {
    await logout.mutateAsync();
    navigate('/login');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Desktop Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-white dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 z-40 transition-all duration-300 hidden lg:block ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-200 dark:border-neutral-700">
          <AnimatePresence mode="wait">
            {sidebarOpen ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-neutral-900 dark:text-white">EduConnect</span>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mx-auto"
              >
                <GraduationCap className="w-5 h-5 text-white" />
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
                  isActive
                    ? 'bg-primary-500 text-white shadow-glow'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                } ${!sidebarOpen ? 'justify-center' : ''}`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-200 dark:border-neutral-700">
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors ${
              !sidebarOpen ? 'justify-center' : ''
            }`}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
            {sidebarOpen && <span>Đổi giao diện</span>}
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 z-50 flex items-center justify-between px-4">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg"
        >
          <Menu className="w-6 h-6 text-neutral-700 dark:text-neutral-300" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-neutral-900 dark:text-white">EduConnect</span>
        </div>

        <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg relative">
          <Bell className="w-6 h-6 text-neutral-700 dark:text-neutral-300" />
          {unreadCount && unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-error-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="lg:hidden fixed left-0 top-0 h-full w-72 bg-white dark:bg-neutral-800 z-50"
            >
              <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold text-neutral-900 dark:text-white">EduConnect</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg"
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>

              <nav className="p-4 space-y-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
                        isActive
                          ? 'bg-primary-500 text-white'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>

              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-200 dark:border-neutral-700 space-y-2">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  <span>Đổi giao diện</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div
        className={`transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
        } pt-16 lg:pt-0`}
      >
        {/* Top bar */}
        <header className="hidden lg:flex h-16 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 items-center justify-between px-6">
          <div>
            {/* Breadcrumb or search can go here */}
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl relative transition-colors">
              <Bell className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              {unreadCount && unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-error-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold">
                  {user?.name?.[0] || 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">
                    {user?.name}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {user?.role === 'TEACHER' ? 'Giáo viên' : user?.role === 'ADMIN' ? 'Admin' : 'Học sinh'}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-neutral-400" />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 py-2"
                  >
                    <div className="px-4 py-2 border-b border-neutral-200 dark:border-neutral-700">
                      <p className="font-medium text-neutral-900 dark:text-white">{user?.name}</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">{user?.email}</p>
                    </div>
                    <div className="py-1">
                      <button className="w-full flex items-center gap-2 px-4 py-2 text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                        <User className="w-4 h-4" />
                        Hồ sơ cá nhân
                      </button>
                      <button className="w-full flex items-center gap-2 px-4 py-2 text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                        <Settings className="w-4 h-4" />
                        Cài đặt
                      </button>
                    </div>
                    <div className="border-t border-neutral-200 dark:border-neutral-700 py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-left text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10"
                      >
                        <LogOut className="w-4 h-4" />
                        Đăng xuất
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
