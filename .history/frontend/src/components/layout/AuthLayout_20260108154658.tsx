import { Outlet, Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { ToastContainer } from '@/components/ui/Toast';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link to="/" className="inline-flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <span className="font-bold text-2xl text-neutral-900 dark:text-white">
            LMS Platform
          </span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
        <p>© 2024 LMS Platform. Nhóm 14 - Lập trình mạng.</p>
      </footer>

      <ToastContainer />
    </div>
  );
}
