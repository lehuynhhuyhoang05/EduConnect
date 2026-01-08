import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Grid3X3,
  List,
  Users,
  BookOpen,
  MoreVertical,
  Settings,
  Trash2,
  Loader2,
  AlertCircle,
  UserPlus,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/Dropdown';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/Tabs';
import { useClasses, useLeaveClass } from '@/hooks/useClasses';
import { useCurrentUser } from '@/hooks/useAuth';
import { JoinClassModal } from '@/components/classes/JoinClassModal';
import { toast } from 'sonner';
import type { Class } from '@/types';

// Gradient colors for class covers
const COVER_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)',
  'linear-gradient(135deg, #c3cfe2 0%, #c3cfe2 100%)',
  'linear-gradient(135deg, #f5af19 0%, #f12711 100%)',
];

const getClassCover = (id: number) => {
  return COVER_GRADIENTS[id % COVER_GRADIENTS.length];
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const ClassesPage = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filter, setFilter] = React.useState<'all' | 'myClasses'>('all');
  const [isJoinModalOpen, setIsJoinModalOpen] = React.useState(false);

  // Get current user to determine role
  const { data: currentUser } = useCurrentUser();
  const isTeacher = currentUser?.role === 'TEACHER';
  const isStudent = currentUser?.role === 'STUDENT';

  // Fetch classes from API
  const { data: classesData, isLoading, error, refetch } = useClasses({
    myClasses: filter === 'myClasses' ? true : undefined,
    search: searchQuery || undefined,
  });

  const classes = classesData?.data || [];

  // Filter locally for search (API may not support search)
  const filteredClasses = classes.filter((cls) => {
    if (!searchQuery) return true;
    return cls.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (isLoading) {
    return (
      <PageContainer title="Lớp học" description="Đang tải...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Lớp học" description="Có lỗi xảy ra">
        <div className="flex flex-col items-center justify-center h-64">
          <AlertCircle className="h-12 w-12 text-error-500 mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Không thể tải danh sách lớp học
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            {error instanceof Error ? error.message : 'Đã xảy ra lỗi'}
          </p>
          <Button onClick={() => refetch()}>Thử lại</Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Lớp học"
      description="Quản lý và theo dõi các lớp học của bạn"
      actions={
        <div className="flex gap-2">
          {/* Student: Join class button */}
          {isStudent && (
            <Button 
              variant="outline"
              leftIcon={<UserPlus className="h-4 w-4" />}
              onClick={() => setIsJoinModalOpen(true)}
            >
              Tham gia lớp
            </Button>
          )}
          {/* Teacher: Create class and Join class buttons */}
          {isTeacher && (
            <>
              <Button 
                variant="outline"
                leftIcon={<UserPlus className="h-4 w-4" />}
                onClick={() => setIsJoinModalOpen(true)}
              >
                Tham gia lớp
              </Button>
              <Button 
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => navigate('/classes/create')}
              >
                Tạo lớp học
              </Button>
            </>
          )}
        </div>
      }
    >
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Tìm kiếm lớp học..."
            leftIcon={<Search className="h-4 w-4" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList>
              <TabsTrigger value="all">Tất cả</TabsTrigger>
              <TabsTrigger value="myClasses">Lớp của tôi</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="hidden sm:flex items-center gap-1 ml-2">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Classes Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={cn(
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
        )}
      >
        {filteredClasses.map((cls) => (
          <motion.div key={cls.id} variants={itemVariants}>
            {viewMode === 'grid' ? (
              <ClassCard classData={cls} />
            ) : (
              <ClassListItem classData={cls} />
            )}
          </motion.div>
        ))}
      </motion.div>

      {filteredClasses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Không tìm thấy lớp học
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400">
            {searchQuery ? 'Thử thay đổi từ khóa tìm kiếm' : 'Bạn chưa tham gia lớp học nào'}
          </p>
        </div>
      )}

      {/* Join Class Modal */}
      <JoinClassModal 
        isOpen={isJoinModalOpen} 
        onClose={() => setIsJoinModalOpen(false)} 
      />
    </PageContainer>
  );
};

// Class Card Component
const ClassCard = ({ classData }: { classData: Class }) => {
  const navigate = useNavigate();
  const leaveClassMutation = useLeaveClass();
  const { data: currentUser } = useCurrentUser();
  const isTeacher = currentUser?.role === 'TEACHER' && classData.teacherId === currentUser?.id;

  const handleLeaveClass = async () => {
    if (confirm('Bạn có chắc muốn rời khỏi lớp học này?')) {
      try {
        await leaveClassMutation.mutateAsync(classData.id);
        toast.success('Đã rời khỏi lớp học');
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Không thể rời khỏi lớp học');
      }
    }
  };
  
  return (
    <Card variant="elevated" padding="none" className="overflow-hidden group">
      {/* Cover */}
      <Link to={`/classes/${classData.id}`}>
        <div
          className="h-32 relative"
          style={{ background: getClassCover(classData.id) }}
        >
          <div className="absolute bottom-3 right-3">
            <Avatar 
              name={classData.teacher?.fullName || classData.teacher?.name || 'Teacher'} 
              size="md" 
              showRing 
            />
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <Link to={`/classes/${classData.id}`}>
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-primary-600 transition-colors line-clamp-1">
              {classData.name}
            </h3>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/classes/${classData.id}`)}>
                <Settings className="h-4 w-4 mr-2" />
                Xem chi tiết
              </DropdownMenuItem>
              {!isTeacher && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive onClick={handleLeaveClass}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Rời lớp
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 mb-3">
          {classData.description || 'Không có mô tả'}
        </p>

        {/* Subject tag */}
        {classData.subject && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            <Badge variant="default" size="sm">
              {classData.subject}
            </Badge>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-neutral-500 mb-3">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {classData.membersCount || classData._count?.members || 0}
          </div>
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" />
            {classData._count?.assignments || 0} bài tập
          </div>
        </div>

        {/* Class code */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <span className="font-mono bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
              {classData.classCode}
            </span>
          </div>
          <Button 
            size="xs" 
            variant="ghost"
            onClick={() => navigate(`/classes/${classData.id}`)}
          >
            Xem chi tiết
          </Button>
        </div>
      </div>
    </Card>
  );
};

// Class List Item Component
const ClassListItem = ({ classData }: { classData: Class }) => {
  const navigate = useNavigate();
  const leaveClassMutation = useLeaveClass();
  const { data: currentUser } = useCurrentUser();
  const isTeacher = currentUser?.role === 'TEACHER' && classData.teacherId === currentUser?.id;

  const handleLeaveClass = async () => {
    if (confirm('Bạn có chắc muốn rời khỏi lớp học này?')) {
      try {
        await leaveClassMutation.mutateAsync(classData.id);
        toast.success('Đã rời khỏi lớp học');
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Không thể rời khỏi lớp học');
      }
    }
  };
  
  return (
    <Card variant="elevated" className="group">
      <div className="flex items-center gap-4">
        {/* Cover thumbnail */}
        <Link to={`/classes/${classData.id}`}>
          <div
            className="h-20 w-32 rounded-xl shrink-0"
            style={{ background: getClassCover(classData.id) }}
          />
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link to={`/classes/${classData.id}`}>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-primary-600 transition-colors">
                {classData.name}
              </h3>
            </Link>
            {classData.subject && (
              <Badge variant="default" size="sm">
                {classData.subject}
              </Badge>
            )}
          </div>

          <p className="text-sm text-neutral-500 mb-2">
            {classData.teacher?.fullName || classData.teacher?.name || 'Giáo viên'}
          </p>

          <div className="flex items-center gap-4 text-sm text-neutral-500">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {classData.membersCount || classData._count?.members || 0} thành viên
            </div>
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              {classData._count?.assignments || 0} bài tập
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              {classData.classCode}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => navigate(`/classes/${classData.id}`)}
          >
            Vào lớp
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/classes/${classData.id}`)}>
                <Settings className="h-4 w-4 mr-2" />
                Xem chi tiết
              </DropdownMenuItem>
              {!isTeacher && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive onClick={handleLeaveClass}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Rời lớp
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
};

export default ClassesPage;
