import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { GraduationCap, Mail, Lock, User, ArrowRight, Github, Chrome, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useRegister } from '@/hooks';

const RegisterPage = () => {
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'STUDENT' as 'STUDENT' | 'TEACHER',
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const passwordStrength = React.useMemo(() => {
    const password = formData.password;
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  }, [formData.password]);

  const passwordStrengthLabel = ['Rất yếu', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'][passwordStrength - 1] || '';
  const passwordStrengthColor = ['bg-error-500', 'bg-error-400', 'bg-warning-500', 'bg-success-400', 'bg-success-500'][passwordStrength - 1] || 'bg-neutral-200';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = 'Vui lòng nhập họ tên';
    if (!formData.email) newErrors.email = 'Vui lòng nhập email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }
    if (!formData.password) newErrors.password = 'Vui lòng nhập mật khẩu';
    else if (formData.password.length < 8) {
      newErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await registerMutation.mutateAsync({
        fullName: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });
      navigate('/login');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Đăng ký thất bại. Vui lòng thử lại.';
      setErrors({ general: errorMessage });
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-neutral-50 dark:bg-neutral-950">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-neutral-900 dark:text-neutral-100">EduLMS</span>
          </div>

          <Card variant="elevated" padding="lg" className="shadow-soft-xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                Tạo tài khoản mới
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 mt-2">
                Bắt đầu hành trình học tập của bạn
              </p>
            </div>

            {/* Role selection */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { value: 'STUDENT', label: 'Học viên', desc: 'Tham gia các lớp học' },
                { value: 'TEACHER', label: 'Giảng viên', desc: 'Tạo và quản lý lớp' },
              ].map((role) => (
                <motion.button
                  key={role.value}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setFormData((prev) => ({ ...prev, role: role.value as 'STUDENT' | 'TEACHER' }))}
                  className={cn(
                    'relative p-4 rounded-xl border-2 text-left transition-all',
                    formData.role === role.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                  )}
                >
                  {formData.role === role.value && (
                    <div className="absolute top-2 right-2 h-5 w-5 bg-primary-500 rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <p className={cn(
                    'font-semibold text-sm',
                    formData.role === role.value ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-900 dark:text-neutral-100'
                  )}>
                    {role.label}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">{role.desc}</p>
                </motion.button>
              ))}
            </div>

            {/* Social signup */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <Button variant="outline" leftIcon={<Chrome className="h-4 w-4" />}>
                Google
              </Button>
              <Button variant="outline" leftIcon={<Github className="h-4 w-4" />}>
                GitHub
              </Button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white dark:bg-neutral-900 px-4 text-sm text-neutral-500">
                  hoặc đăng ký với email
                </span>
              </div>
            </div>

            {/* Register form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {errors.general && (
                <div className="p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg">
                  <p className="text-sm text-error-600 dark:text-error-400">{errors.general}</p>
                </div>
              )}

              <Input
                label="Họ và tên"
                name="name"
                placeholder="Nguyễn Văn A"
                leftIcon={<User className="h-4 w-4" />}
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
              />

              <Input
                label="Email"
                name="email"
                type="email"
                placeholder="name@example.com"
                leftIcon={<Mail className="h-4 w-4" />}
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
              />

              <div className="space-y-2">
                <Input
                  label="Mật khẩu"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  leftIcon={<Lock className="h-4 w-4" />}
                  showPasswordToggle
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password}
                />
                {formData.password && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={cn(
                            'h-1 flex-1 rounded-full transition-colors',
                            level <= passwordStrength ? passwordStrengthColor : 'bg-neutral-200 dark:bg-neutral-700'
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-neutral-500">
                      Độ mạnh: <span className={cn(
                        passwordStrength >= 4 ? 'text-success-500' :
                        passwordStrength >= 3 ? 'text-warning-500' : 'text-error-500'
                      )}>{passwordStrengthLabel}</span>
                    </p>
                  </div>
                )}
              </div>

              <Input
                label="Xác nhận mật khẩu"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                leftIcon={<Lock className="h-4 w-4" />}
                showPasswordToggle
                value={formData.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
              />

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="terms"
                  className="h-4 w-4 mt-0.5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  required
                />
                <label htmlFor="terms" className="text-sm text-neutral-600 dark:text-neutral-400">
                  Tôi đồng ý với{' '}
                  <Link to="/terms" className="text-primary-600 hover:underline">Điều khoản sử dụng</Link>
                  {' '}và{' '}
                  <Link to="/privacy" className="text-primary-600 hover:underline">Chính sách bảo mật</Link>
                </label>
              </div>

              <Button
                type="submit"
                fullWidth
                size="lg"
                isLoading={registerMutation.isPending}
                rightIcon={!registerMutation.isPending && <ArrowRight className="h-4 w-4" />}
              >
                Đăng ký
              </Button>
            </form>

            <p className="text-center text-sm text-neutral-600 dark:text-neutral-400 mt-6">
              Đã có tài khoản?{' '}
              <Link
                to="/login"
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
              >
                Đăng nhập
              </Link>
            </p>
          </Card>
        </motion.div>
      </div>

      {/* Right side - Branding */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
      >
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-bl from-secondary-600 via-primary-600 to-primary-700" />
        
        {/* Animated shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              x: [0, -100, 0],
              y: [0, 50, 0],
              rotate: [0, -180, -360],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-20 -right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              x: [0, 80, 0],
              y: [0, -80, 0],
            }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            className="absolute -bottom-40 -left-20 w-[500px] h-[500px] bg-primary-500/20 rounded-full blur-3xl"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <GraduationCap className="h-7 w-7" />
              </div>
              <span className="text-2xl font-bold">EduLMS</span>
            </div>

            <h1 className="text-4xl font-bold mb-4">
              Tham gia cộng đồng
              <br />
              <span className="text-primary-200">học tập của chúng tôi</span>
            </h1>

            <p className="text-lg text-white/80 max-w-md mb-8">
              Hàng nghìn học viên và giảng viên đã tin tưởng sử dụng EduLMS
              để nâng cao kiến thức và kỹ năng.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6">
              {[
                { value: '10K+', label: 'Học viên' },
                { value: '500+', label: 'Khóa học' },
                { value: '100+', label: 'Giảng viên' },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="text-center"
                >
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-white/70 text-sm">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
