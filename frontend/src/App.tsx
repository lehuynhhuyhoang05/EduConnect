import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { Toaster } from '@/components/ui/sonner';
import { useAuthStore } from '@/store';
import { socketManager } from '@/services/socket';
import { getAccessToken } from '@/services/api';
import ApiDebugPanel from '@/components/debug/ApiDebugPanel';

// Lazy load pages for better performance
const LoginPage = React.lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = React.lazy(() => import('@/pages/auth/RegisterPage'));
const DashboardPage = React.lazy(() => import('@/pages/dashboard/DashboardPage'));
const ClassesPage = React.lazy(() => import('@/pages/classes/ClassesPage'));
const ClassDetailPage = React.lazy(() => import('@/pages/classes/ClassDetailPage'));
const CreateClassPage = React.lazy(() => import('@/pages/classes/CreateClassPage'));
const LiveSessionPage = React.lazy(() => import('@/pages/live-session/LiveSessionPage'));
const LiveSessionsPage = React.lazy(() => import('@/pages/live-session/LiveSessionsPage'));
const AssignmentsPage = React.lazy(() => import('@/pages/assignments/AssignmentsPage'));
const AssignmentDetailPage = React.lazy(() => import('@/pages/assignments/AssignmentDetailPage'));
const CreateAssignmentPage = React.lazy(() => import('@/pages/assignments/CreateAssignmentPage'));
const SubmissionsPage = React.lazy(() => import('@/pages/assignments/SubmissionsPage'));
const GradesPage = React.lazy(() => import('@/pages/grades/GradesPage'));

// Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Protected Route wrapper
const ProtectedRoute = () => {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

// Public Route wrapper (redirect to dashboard if authenticated)
const PublicRoute = () => {
  const { isAuthenticated } = useAuthStore();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
    <div className="flex flex-col items-center gap-4">
      <div className="h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-neutral-500">Đang tải...</p>
    </div>
  </div>
);

// App Router
const AppRouter = () => {
  return (
    <React.Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/classes" element={<ClassesPage />} />
          <Route path="/classes/create" element={<CreateClassPage />} />
          <Route path="/classes/:classId" element={<ClassDetailPage />} />
          <Route path="/live-sessions" element={<LiveSessionsPage />} />
          <Route path="/live-sessions/:sessionId" element={<LiveSessionPage />} />
          <Route path="/assignments" element={<AssignmentsPage />} />
          <Route path="/assignments/create" element={<CreateAssignmentPage />} />
          <Route path="/assignments/:id" element={<AssignmentDetailPage />} />
          <Route path="/assignments/:id/submissions" element={<SubmissionsPage />} />
          <Route path="/gradebook" element={<GradesPage />} />
          <Route path="/grades" element={<GradesPage />} />
          <Route path="/materials" element={<DashboardPage />} />
          <Route path="/calendar" element={<DashboardPage />} />
          <Route path="/messages" element={<DashboardPage />} />
          <Route path="/students" element={<DashboardPage />} />
          <Route path="/reports" element={<DashboardPage />} />
          <Route path="/gradebook" element={<DashboardPage />} />
          <Route path="/notifications" element={<DashboardPage />} />
          <Route path="/settings" element={<DashboardPage />} />
          <Route path="/profile" element={<DashboardPage />} />
        </Route>

        {/* Redirect root to dashboard or login */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* 404 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </React.Suspense>
  );
};

// Main App component
function App() {
  const { isAuthenticated } = useAuthStore();

  // Initialize theme on mount
  React.useEffect(() => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // System preference
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', isDark);
    }
  }, []);

  // Connect socket when authenticated
  React.useEffect(() => {
    const token = getAccessToken();
    if (isAuthenticated && token && !socketManager.isConnected()) {
      socketManager.connect(token);
    } else if (!isAuthenticated && socketManager.isConnected()) {
      socketManager.disconnect();
    }
  }, [isAuthenticated]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AppRouter />
          <Toaster position="top-right" richColors />
          <ApiDebugPanel />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
