import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { classesApi } from '@/services/api';
import type {
  CreateClassDto,
  UpdateClassDto,
  QueryClassDto,
  CreateAnnouncementDto,
} from '@/types';

// Query keys
export const classKeys = {
  all: ['classes'] as const,
  lists: () => [...classKeys.all, 'list'] as const,
  list: (params?: QueryClassDto) => [...classKeys.lists(), params] as const,
  details: () => [...classKeys.all, 'detail'] as const,
  detail: (id: number) => [...classKeys.details(), id] as const,
  members: (id: number) => [...classKeys.detail(id), 'members'] as const,
  announcements: (id: number) => [...classKeys.detail(id), 'announcements'] as const,
  gradebook: (id: number) => [...classKeys.detail(id), 'gradebook'] as const,
  myGrades: (id: number) => [...classKeys.detail(id), 'my-grades'] as const,
};

// ============================================
// QUERIES
// ============================================

// Get all classes
export const useClasses = (params?: QueryClassDto) => {
  return useQuery({
    queryKey: classKeys.list(params),
    queryFn: () => classesApi.getAll(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Get my classes
export const useMyClasses = () => {
  return useClasses({ myClasses: true });
};

// Get class by ID
export const useClass = (id: number) => {
  return useQuery({
    queryKey: classKeys.detail(id),
    queryFn: () => classesApi.getById(id),
    enabled: !!id,
  });
};

// Get class members
export const useClassMembers = (classId: number) => {
  return useQuery({
    queryKey: classKeys.members(classId),
    queryFn: () => classesApi.getMembers(classId),
    enabled: !!classId,
  });
};

// Get announcements
export const useAnnouncements = (classId: number) => {
  return useQuery({
    queryKey: classKeys.announcements(classId),
    queryFn: () => classesApi.getAnnouncements(classId),
    enabled: !!classId,
  });
};

// Get gradebook (teacher)
export const useGradebook = (classId: number) => {
  return useQuery({
    queryKey: classKeys.gradebook(classId),
    queryFn: () => classesApi.getGradebook(classId),
    enabled: !!classId,
  });
};

// Get my grades (student)
export const useMyGrades = (classId: number) => {
  return useQuery({
    queryKey: classKeys.myGrades(classId),
    queryFn: () => classesApi.getMyGrades(classId),
    enabled: !!classId,
  });
};

// ============================================
// MUTATIONS
// ============================================

// Create class
export const useCreateClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClassDto) => classesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classKeys.lists() });
    },
  });
};

// Update class
export const useUpdateClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateClassDto }) => classesApi.update(id, data),
    onSuccess: (updatedClass) => {
      queryClient.setQueryData(classKeys.detail(updatedClass.id), updatedClass);
      queryClient.invalidateQueries({ queryKey: classKeys.lists() });
    },
  });
};

// Delete class
export const useDeleteClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => classesApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: classKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: classKeys.lists() });
    },
  });
};

// Join class
export const useJoinClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (classCode: string) => classesApi.join(classCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classKeys.lists() });
    },
  });
};

// Leave class
export const useLeaveClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (classId: number) => classesApi.leave(classId),
    onSuccess: (_, classId) => {
      queryClient.removeQueries({ queryKey: classKeys.detail(classId) });
      queryClient.invalidateQueries({ queryKey: classKeys.lists() });
    },
  });
};

// Remove member
export const useRemoveMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ classId, userId }: { classId: number; userId: number }) =>
      classesApi.removeMember(classId, userId),
    onSuccess: (_, { classId }) => {
      queryClient.invalidateQueries({ queryKey: classKeys.members(classId) });
    },
  });
};

// Create announcement
export const useCreateAnnouncement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ classId, data }: { classId: number; data: CreateAnnouncementDto }) =>
      classesApi.createAnnouncement(classId, data),
    onSuccess: (_, { classId }) => {
      queryClient.invalidateQueries({ queryKey: classKeys.announcements(classId) });
    },
  });
};

// Update announcement
export const useUpdateAnnouncement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      classId,
      announcementId,
      data,
    }: {
      classId: number;
      announcementId: number;
      data: Partial<CreateAnnouncementDto>;
    }) => classesApi.updateAnnouncement(classId, announcementId, data),
    onSuccess: (_, { classId }) => {
      queryClient.invalidateQueries({ queryKey: classKeys.announcements(classId) });
    },
  });
};

// Delete announcement
export const useDeleteAnnouncement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ classId, announcementId }: { classId: number; announcementId: number }) =>
      classesApi.deleteAnnouncement(classId, announcementId),
    onSuccess: (_, { classId }) => {
      queryClient.invalidateQueries({ queryKey: classKeys.announcements(classId) });
    },
  });
};

// Mark announcement as read
export const useMarkAnnouncementRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ classId, announcementId }: { classId: number; announcementId: number }) =>
      classesApi.markAnnouncementRead(classId, announcementId),
    onSuccess: (_, { classId }) => {
      queryClient.invalidateQueries({ queryKey: classKeys.announcements(classId) });
    },
  });
};

// Export gradebook
export const useExportGradebook = () => {
  return useMutation({
    mutationFn: (classId: number) => classesApi.exportGradebook(classId),
    onSuccess: (blob, classId) => {
      // Download the file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gradebook-class-${classId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });
};
