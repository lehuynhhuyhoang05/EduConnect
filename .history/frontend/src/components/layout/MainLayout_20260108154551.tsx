import { Outlet } from 'react-router-dom';
import { cn } from '@/utils/helpers';
import { useUIStore } from '@/store/uiStore';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '@/components/ui/Toast';

interface MainLayoutProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function MainLayout({ title, subtitle, actions }: MainLayoutProps) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Sidebar />
      <div
        className={cn(
          'min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'ml-20' : 'ml-64'
        )}
      >
        <Header title={title} subtitle={subtitle} actions={actions} />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}

// Simple wrapper for pages that don't need header props
export function MainLayoutWrapper() {
  return <MainLayout />;
}
