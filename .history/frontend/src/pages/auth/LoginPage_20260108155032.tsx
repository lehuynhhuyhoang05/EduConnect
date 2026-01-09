import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login, isLoggingIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormData) => {
    login(data);
  };

  return (
    <Card className="w-full shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Đăng nhập</CardTitle>
        <CardDescription>
          Chào mừng bạn quay trở lại! Vui lòng đăng nhập để tiếp tục.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            {...register('email')}
            type="email"
            label="Email"
            placeholder="name@example.com"
            leftIcon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
          />

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
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            error={errors.password?.message}
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-neutral-600 dark:text-neutral-400">Ghi nhớ đăng nhập</span>
            </label>
            <Link
              to="/forgot-password"
              className="text-sm text-primary-500 hover:text-primary-600"
            >
              Quên mật khẩu?
            </Link>
          </div>

          <Button type="submit" className="w-full" size="lg" isLoading={isLoggingIn}>
            Đăng nhập
          </Button>

          <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-primary-500 hover:text-primary-600 font-medium">
              Đăng ký ngay
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
