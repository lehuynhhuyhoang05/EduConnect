import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { classesApi } from '@/services/api/classes.api';
import { queryKeys } from '@/lib/queryClient';
import { useToast } from '@/components/ui/Toast';
import type { Class } from '@/types/class.types';

export function useClasses(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: queryKeys.classes.list(params),
    queryFn: () => classesApi.getMyClasses(params),
  });
}

export function useClass(classId: string) {
  return useQuery({
    queryKey: queryKeys.classes.detail(classId),
    queryFn: () => classesApi.getClassById(classId),
    enabled: !!classId,
  });
}

export function useClassMembers(classId: string) {
  return useQuery({
    queryKey: queryKeys.classes.members(classId),
    queryFn: () => classesApi.getClassMembers(classId),
    enabled: !!classId,
  });
}

export function useClassAnnouncements(classId: string) {
  return useQuery({
    queryKey: queryKeys.classes.announcements(classId),
    queryFn: () => classesApi.getAnnouncements(classId),
    enabled: !!classId,
  });
}

export function useCreateClass() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: classesApi.createClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.classes.all });
      toast.success('Tạo lớp học thành công!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Tạo lớp học thất bại');
    },
  });
}

export function useUpdateClass() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ classId, data }: { classId: string; data: Partial<Class> }) =>
      classesApi.updateClass(classId, data),
    onSuccess: (_, { classId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.classes.detail(classId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.classes.all });
      toast.success('Cập nhật lớp học thành công!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Cập nhật thất bại');
    },
  });
}

export function useDeleteClass() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: classesApi.deleteClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.classes.all });
      toast.success('Xóa lớp học thành công!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Xóa lớp học thất bại');
    },
  });
}

export function useJoinClass() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: classesApi.joinClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.classes.all });
      toast.success('Tham gia lớp học thành công!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Tham gia lớp học thất bại');
    },
  });
}

export function useLeaveClass() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: classesApi.leaveClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.classes.all });
      toast.success('Rời lớp học thành công!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Rời lớp học thất bại');
    },
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ classId, content }: { classId: string; content: string }) =>
      classesApi.createAnnouncement(classId, content),
    onSuccess: (_, { classId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.classes.announcements(classId) });
      toast.success('Đăng thông báo thành công!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Đăng thông báo thất bại');
    },
  });
}
