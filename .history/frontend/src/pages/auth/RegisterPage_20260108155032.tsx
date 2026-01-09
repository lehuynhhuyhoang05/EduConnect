import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/Card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { UserRole } from '@/types/user.types';

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Họ tên tối thiểu 2 ký tự'),
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
    confirmPassword: z.string(),
    role: z.nativeEnum(UserRole),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const { register: registerUser, isRegistering } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: UserRole.STUDENT,
    },
  });

  const selectedRole = watch('role');

  const onSubmit = (data: RegisterFormData) => {
    const { confirmPassword, ...registerData } = data;
    registerUser(registerData);
  };

  return (
    <Card className="w-full shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Đăng ký tài khoản</CardTitle>
        <CardDescription>
          Tạo tài khoản mới để bắt đầu học tập trực tuyến.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            {...register('fullName')}
            label="Họ và tên"
            placeholder="Nguyễn Văn A"
            leftIcon={<User className="h-4 w-4" />}
            error={errors.fullName?.message}
          />

          <Input
            {...register('email')}
            type="email"
            label="Email"
            placeholder="name@example.com"
            leftIcon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Vai trò
            </label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setValue('role', value as UserRole)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn vai trò" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UserRole.STUDENT}>Học sinh</SelectItem>
                <SelectItem value={UserRole.TEACHER}>Giáo viên</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-red-500">{errors.role.message}</p>
            )}
          </div>

          <Input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            label="Mật khẩu"
            placeholder="••••••••"
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
            error={errors.password?.message}
          />

          <Input
            {...register('confirmPassword')}
            type={showConfirmPassword ? 'text' : 'password'}
            label="Xác nhận mật khẩu"
            placeholder="••••••••"
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
            error={errors.confirmPassword?.message}
          />

          <Button type="submit" className="w-full" size="lg" isLoading={isRegistering}>
            Đăng ký
          </Button>

          <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-primary-500 hover:text-primary-600 font-medium">
              Đăng nhập
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
