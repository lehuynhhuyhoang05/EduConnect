import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useEffect } from 'react';
import { useThemeStore, useAuthStore } from './store';

// Layout
import { MainLayout } from './components/layout';

// Pages
import { DashboardPage } from './pages/dashboard';
import { GradesPage } from './pages/grades';
import { AssignmentsPage, SubmissionsPage } from './pages/assignments';
import { LiveSessionsPage, LiveSessionPage } from './pages/live-session';
import { LoginPage, RegisterPage } from './pages/auth';
import { ClassesPage, ClassDetailPage } from './pages/classes';

// Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// Public Route Component (redirects if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

function AppContent() {
  const { theme } = useThemeStore();

  // Apply theme on mount and when it changes
  useEffect(() => {
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', isDark);
    } else {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute>
          <RegisterPage />
        </PublicRoute>
      } />

      {/* Protected Routes with Layout */}
      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="classes" element={<ClassesPage />} />
        <Route path="classes/:classId" element={<ClassDetailPage />} />
        <Route path="assignments" element={<AssignmentsPage />} />
        <Route path="assignments/:assignmentId/submissions" element={<SubmissionsPage />} />
        <Route path="grades" element={<GradesPage />} />
        <Route path="live-sessions" element={<LiveSessionsPage />} />
      </Route>

      {/* Live Session - Full screen without layout */}
      <Route path="/live-session/:sessionId" element={
        <ProtectedRoute>
          <LiveSessionPage />
        </ProtectedRoute>
      } />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;

