// Auth hooks
export {
  useAuth,
  useCurrentUser,
  useLogin,
  useRegister,
  useLogout,
  authKeys,
} from './useAuth';

// Classes hooks
export {
  useClasses,
  useMyClasses,
  useClass,
  useClassMembers,
  useAnnouncements,
  useGradebook,
  useMyGrades,
  useCreateClass,
  useUpdateClass,
  useDeleteClass,
  useJoinClass,
  useLeaveClass,
  useRemoveMember,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
  useMarkAnnouncementRead,
  classKeys,
} from './useClasses';

// Assignments hooks
export {
  useAssignments,
  useClassAssignments,
  useAssignment,
  useSubmissions,
  useMySubmission,
  useAssignmentStats,
  useCreateAssignment,
  useUpdateAssignment,
  useDeleteAssignment,
  useSubmitAssignment,
  useGradeSubmission,
  useReturnSubmission,
  useUpcomingAssignments,
  useOverdueAssignments,
  assignmentKeys,
} from './useAssignments';

// Live sessions hooks
export {
  useLiveSessions,
  useUpcomingSessions,
  useLiveSessionsActive,
  useLiveSession,
  useWebRTCConfig,
  useSessionPolls,
  useSessionAttendance,
  useCreateSession,
  useUpdateSession,
  useDeleteSession,
  useStartSession,
  useEndSession,
  useJoinSession,
  useLeaveSession,
  useCreatePoll,
  useVotePoll,
  useRaiseHand,
  useLowerHand,
  useStartRecording,
  useStopRecording,
  useLiveSessionRealtime,
  useWebRTC,
  sessionKeys,
} from './useLiveSessions';

// Notifications hooks
export {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useDeleteAllNotifications,
  useNotificationsRealtime,
  useNotificationsManager,
  notificationKeys,
} from './useNotifications';

// Chat hooks
export {
  useChatRooms,
  useClassMessages,
  useSessionMessages,
  useSendClassMessage,
  useSendSessionMessage,
  useEditMessage,
  useDeleteMessage,
  useChatRealtime,
  useSearchMessages,
  chatKeys,
} from './useChat';

// Files hooks
export {
  useFiles,
  useDeleteFile,
  useFileUpload,
  useMultipleFileUpload,
  useFileDownload,
  fileKeys,
} from './useFiles';

// Error tracking hooks
export {
  useApiError,
  useErrorMessage,
} from './useApiError';
