import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Grid,
  List,
  Users,
  BookOpen,
  MoreVertical,
  Copy,
  Trash2,
  Settings,
  LogOut,
} from 'lucide-react';
import { useClasses, useCreateClass, useJoinClass, useDeleteClass, useLeaveClass } from '@/hooks/useClasses';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { cn } from '@/utils/helpers';
import { UserRole } from '@/types/user.types';

export function ClassesListPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Form state
  const [newClassName, setNewClassName] = useState('');
  const [newClassSubject, setNewClassSubject] = useState('');
  const [newClassDescription, setNewClassDescription] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const { data: classes, isLoading } = useClasses({ search });
  const createClass = useCreateClass();
  const joinClass = useJoinClass();
  const deleteClass = useDeleteClass();
  const leaveClass = useLeaveClass();

  const isTeacher = user?.role === UserRole.TEACHER;

  const handleCreateClass = () => {
    if (!newClassName.trim()) return;
    createClass.mutate(
      {
        name: newClassName,
        subject: newClassSubject,
        description: newClassDescription,
      },
      {
        onSuccess: () => {
          setCreateDialogOpen(false);
          setNewClassName('');
          setNewClassSubject('');
          setNewClassDescription('');
        },
      }
    );
  };

  const handleJoinClass = () => {
    if (!joinCode.trim()) return;
    joinClass.mutate(joinCode, {
      onSuccess: () => {
        setJoinDialogOpen(false);
        setJoinCode('');
      },
    });
  };

  const handleDeleteClass = () => {
    if (!selectedClassId) return;
    deleteClass.mutate(selectedClassId, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setSelectedClassId(null);
      },
    });
  };

  const handleLeaveClass = (classId: string) => {
    leaveClass.mutate(classId);
  };

  const copyClassCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Lớp học
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Quản lý và tham gia các lớp học của bạn
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setJoinDialogOpen(true)}>
            Tham gia lớp
          </Button>
          {isTeacher && (
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateDialogOpen(true)}>
              Tạo lớp học
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1 w-full sm:max-w-md">
          <Input
            type="search"
            placeholder="Tìm kiếm lớp học..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Classes Grid/List */}
      {isLoading ? (
        <div className={cn(
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'space-y-3'
        )}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : classes?.data?.length ? (
        <div className={cn(
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'space-y-3'
        )}>
          {classes.data.map((cls) => (
            <Card
              key={cls.id}
              className="group hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              {/* Banner */}
              <div
                className="h-24 relative"
                style={{ backgroundColor: cls.color || '#3B82F6' }}
              >
                <div className="absolute inset-0 bg-black/10" />
                <div className="absolute top-3 right-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 bg-white/20 hover:bg-white/30 text-white"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {cls.classCode && (
                        <>
                          <DropdownMenuItem onClick={() => copyClassCode(cls.classCode!)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Sao chép mã lớp
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem asChild>
                        <Link to={`/classes/${cls.id}/settings`}>
                          <Settings className="h-4 w-4 mr-2" />
                          Cài đặt
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {cls.ownerId === user?.id ? (
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedClassId(cls.id);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Xóa lớp
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => handleLeaveClass(cls.id)}
                          className="text-red-600"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Rời lớp
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <CardContent className="p-4">
                <Link to={`/classes/${cls.id}`}>
                  <h3 className="font-semibold text-neutral-900 dark:text-white group-hover:text-primary-500 transition-colors truncate">
                    {cls.name}
                  </h3>
                </Link>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate mt-1">
                  {cls.subject || 'Chưa có môn học'}
                </p>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-4 text-sm text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {cls.memberCount || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {cls.assignmentCount || 0}
                    </span>
                  </div>
                  {cls.classCode && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {cls.classCode}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="Chưa có lớp học"
          description={
            isTeacher
              ? 'Bạn chưa tạo lớp học nào. Hãy bắt đầu bằng cách tạo lớp học mới.'
              : 'Bạn chưa tham gia lớp học nào. Hãy tham gia bằng mã lớp từ giáo viên.'
          }
          action={{
            label: isTeacher ? 'Tạo lớp học' : 'Tham gia lớp',
            onClick: () => (isTeacher ? setCreateDialogOpen(true) : setJoinDialogOpen(true)),
          }}
        />
      )}

      {/* Create Class Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo lớp học mới</DialogTitle>
            <DialogDescription>
              Điền thông tin để tạo lớp học mới. Học sinh có thể tham gia bằng mã lớp.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              label="Tên lớp học"
              placeholder="VD: Lớp Toán 12A1"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              required
            />
            <Input
              label="Môn học"
              placeholder="VD: Toán học"
              value={newClassSubject}
              onChange={(e) => setNewClassSubject(e.target.value)}
            />
            <Input
              label="Mô tả"
              placeholder="Mô tả ngắn về lớp học"
              value={newClassDescription}
              onChange={(e) => setNewClassDescription(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleCreateClass}
              isLoading={createClass.isPending}
              disabled={!newClassName.trim()}
            >
              Tạo lớp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join Class Dialog */}
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Tham gia lớp học</DialogTitle>
            <DialogDescription>
              Nhập mã lớp học được cung cấp bởi giáo viên để tham gia.
            </DialogDescription>
          </DialogHeader>
          <Input
            label="Mã lớp học"
            placeholder="Nhập mã lớp"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            className="font-mono text-center text-lg tracking-wider"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleJoinClass}
              isLoading={joinClass.isPending}
              disabled={!joinCode.trim()}
            >
              Tham gia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Xóa lớp học"
        description="Bạn có chắc chắn muốn xóa lớp học này? Tất cả dữ liệu liên quan sẽ bị xóa vĩnh viễn."
        variant="danger"
        confirmLabel="Xóa lớp"
        onConfirm={handleDeleteClass}
        isLoading={deleteClass.isPending}
      />
    </div>
  );
}
