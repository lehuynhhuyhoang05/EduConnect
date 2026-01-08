import * as React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useCurrentUser, useLogout } from '@/hooks/useAuth';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  fullWidth?: boolean;
  noPadding?: boolean;
  breadcrumbs?: Breadcrumb[];
}

const PageContainer = ({
  children,
  title,
  description,
  actions,
  fullWidth = false,
  noPadding = false,
  breadcrumbs,
}: PageContainerProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Get real user from API
  const { data: userData } = useCurrentUser();
  const { mutate: logout } = useLogout();
  
  const user = userData ? {
    name: userData.fullName || userData.name || 'User',
    email: userData.email,
    role: (userData.role?.toLowerCase() || 'student') as 'teacher' | 'student' | 'admin',
  } : {
    name: 'Loading...',
    email: '',
    role: 'student' as const,
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        user={user}
      />

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main content area */}
      <div
        className={cn(
          'transition-all duration-200',
          sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[260px]'
        )}
      >
        {/* Header */}
        <Header
          onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          user={user}
          notifications={5}
          messages={3}
          onLogout={handleLogout}
        />

        {/* Page content */}
        <main className={cn(!noPadding && 'p-4 md:p-6 lg:p-8')}>
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <motion.nav
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn('flex items-center gap-1 text-sm mb-4', !fullWidth && 'max-w-7xl mx-auto')}
            >
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <ChevronRight className="h-4 w-4 text-neutral-400" />}
                  {crumb.href ? (
                    <Link
                      to={crumb.href}
                      className="text-neutral-500 hover:text-primary-600 transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-neutral-900 dark:text-neutral-100 font-medium">
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </motion.nav>
          )}

          {/* Page header */}
          {(title || actions) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6',
                !fullWidth && 'max-w-7xl mx-auto'
              )}
            >
              <div>
                {title && (
                  <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {title}
                  </h1>
                )}
                {description && (
                  <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                    {description}
                  </p>
                )}
              </div>
              {actions && <div className="flex items-center gap-3">{actions}</div>}
            </motion.div>
          )}

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cn(!fullWidth && 'max-w-7xl mx-auto')}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

// Simple container without sidebar (for auth pages, live sessions, etc.)
const SimpleContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        'min-h-screen bg-neutral-50 dark:bg-neutral-950',
        className
      )}
    >
      {children}
    </div>
  );
};

export { PageContainer, SimpleContainer };
