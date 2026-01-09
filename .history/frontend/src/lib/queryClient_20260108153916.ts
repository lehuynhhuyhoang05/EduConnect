import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Query keys factory
export const queryKeys = {
  // Auth
  auth: {
    all: ['auth'] as const,
    me: () => [...queryKeys.auth.all, 'me'] as const,
  },
  
  // Users
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.users.details(), id] as const,
  },
  
  // Classes
  classes: {
    all: ['classes'] as const,
    lists: () => [...queryKeys.classes.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.classes.lists(), filters] as const,
    details: () => [...queryKeys.classes.all, 'detail'] as const,
    detail: (id: string | number) => [...queryKeys.classes.details(), id] as const,
    members: (classId: string | number) =>
      [...queryKeys.classes.detail(classId), 'members'] as const,
    announcements: (classId: string | number) =>
      [...queryKeys.classes.detail(classId), 'announcements'] as const,
    gradebook: (classId: string | number) =>
      [...queryKeys.classes.detail(classId), 'gradebook'] as const,
  },
  
  // Assignments
  assignments: {
    all: ['assignments'] as const,
    lists: () => [...queryKeys.assignments.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.assignments.lists(), filters] as const,
    details: () => [...queryKeys.assignments.all, 'detail'] as const,
    detail: (id: string | number) =>
      [...queryKeys.assignments.details(), id] as const,
    submissions: (assignmentId: string | number) =>
      [...queryKeys.assignments.detail(assignmentId), 'submissions'] as const,
    mySubmission: (assignmentId: string | number) =>
      [...queryKeys.assignments.detail(assignmentId), 'my-submission'] as const,
    statistics: (assignmentId: string | number) =>
      [...queryKeys.assignments.detail(assignmentId), 'statistics'] as const,
  },
  
  // Live Sessions
  sessions: {
    all: ['sessions'] as const,
    lists: () => [...queryKeys.sessions.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.sessions.lists(), filters] as const,
    details: () => [...queryKeys.sessions.all, 'detail'] as const,
    detail: (id: string | number) => [...queryKeys.sessions.details(), id] as const,
    participants: (sessionId: string | number) =>
      [...queryKeys.sessions.detail(sessionId), 'participants'] as const,
    polls: (sessionId: string | number) =>
      [...queryKeys.sessions.detail(sessionId), 'polls'] as const,
    questions: (sessionId: string | number) =>
      [...queryKeys.sessions.detail(sessionId), 'questions'] as const,
    attendance: (sessionId: string | number) =>
      [...queryKeys.sessions.detail(sessionId), 'attendance'] as const,
  },
  
  // Chat
  chat: {
    all: ['chat'] as const,
    rooms: () => [...queryKeys.chat.all, 'rooms'] as const,
    messages: (roomId: string, roomType: string) =>
      [...queryKeys.chat.all, 'messages', roomType, roomId] as const,
  },
  
  // Notifications
  notifications: {
    all: ['notifications'] as const,
    lists: () => [...queryKeys.notifications.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.notifications.lists(), filters] as const,
    counts: () => [...queryKeys.notifications.all, 'counts'] as const,
  },
  
  // Files
  files: {
    all: ['files'] as const,
    lists: () => [...queryKeys.files.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.files.lists(), filters] as const,
    detail: (id: string | number) => [...queryKeys.files.all, 'detail', id] as const,
  },
};
