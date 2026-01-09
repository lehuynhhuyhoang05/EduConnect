import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayoutWrapper, AuthLayout } from '@/components/layout';
import { ProtectedRoute, PublicRoute } from './ProtectedRoute';

// Auth Pages
import { LoginPage, RegisterPage } from '@/pages/auth';

// Main Pages
import { DashboardPage } from '@/pages/dashboard';
import { ClassesListPage, ClassDetailPage } from '@/pages/classes';

// Lazy load pages for better performance
// const AssignmentsPage = lazy(() => import('@/pages/assignments'));
// const LiveSessionPage = lazy(() => import('@/pages/live-sessions'));
// const ChatPage = lazy(() => import('@/pages/chat'));
// const NotificationsPage = lazy(() => import('@/pages/notifications'));
// const ProfilePage = lazy(() => import('@/pages/profile'));
// const SettingsPage = lazy(() => import('@/pages/settings'));

export const router = createBrowserRouter([
  // Public Routes (Auth)
  {
    element: <PublicRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            path: '/login',
            element: <LoginPage />,
          },
          {
            path: '/register',
            element: <RegisterPage />,
          },
        ],
      },
    ],
  },

  // Protected Routes (Main App)
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayoutWrapper />,
        children: [
          {
            path: '/dashboard',
            element: <DashboardPage />,
          },
          {
            path: '/classes',
            element: <ClassesListPage />,
          },
          {
            path: '/classes/:classId',
            element: <ClassDetailPage />,
            children: [
              // Tab content will be rendered here via Outlet
              {
                index: true,
                element: <ClassStreamTab />,
              },
              {
                path: 'assignments',
                element: <ClassAssignmentsTab />,
              },
              {
                path: 'members',
                element: <ClassMembersTab />,
              },
              {
                path: 'sessions',
                element: <ClassSessionsTab />,
              },
            ],
          },
          {
            path: '/assignments',
            element: <div className="p-4">Assignments Page - Coming Soon</div>,
          },
          {
            path: '/live-sessions',
            element: <div className="p-4">Live Sessions Page - Coming Soon</div>,
          },
          {
            path: '/live-sessions/:sessionId',
            element: <div className="p-4">Live Session Room - Coming Soon</div>,
          },
          {
            path: '/chat',
            element: <div className="p-4">Chat Page - Coming Soon</div>,
          },
          {
            path: '/notifications',
            element: <div className="p-4">Notifications Page - Coming Soon</div>,
          },
          {
            path: '/profile',
            element: <div className="p-4">Profile Page - Coming Soon</div>,
          },
          {
            path: '/settings',
            element: <div className="p-4">Settings Page - Coming Soon</div>,
          },
        ],
      },
    ],
  },

  // Redirects
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

// Placeholder components for class detail tabs
function ClassStreamTab() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Bảng tin lớp học</h2>
      <p className="text-neutral-500">Nơi đăng thông báo và cập nhật của lớp.</p>
    </div>
  );
}

function ClassAssignmentsTab() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Bài tập</h2>
      <p className="text-neutral-500">Danh sách bài tập của lớp.</p>
    </div>
  );
}

function ClassMembersTab() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Thành viên</h2>
      <p className="text-neutral-500">Danh sách thành viên trong lớp.</p>
    </div>
  );
}

function ClassSessionsTab() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Phiên học trực tuyến</h2>
      <p className="text-neutral-500">Các phiên học video của lớp.</p>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-neutral-900 dark:text-white">404</h1>
        <p className="text-xl text-neutral-500 mt-4">Trang không tồn tại</p>
        <a
          href="/dashboard"
          className="inline-block mt-6 px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
        >
          Về trang chủ
        </a>
      </div>
    </div>
  );
}
