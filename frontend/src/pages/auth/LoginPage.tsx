import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
// Utils loaded as needed
import { motion } from 'framer-motion';
import { GraduationCap, Mail, Lock, ArrowRight, Github, Chrome } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useLogin } from '@/hooks';

const LoginPage = () => {
  const navigate = useNavigate();
  const loginMutation = useLogin();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [errors, setErrors] = React.useState<{ email?: string; password?: string; general?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: { email?: string; password?: string } = {};
    if (!email) newErrors.email = 'Vui lòng nhập email';
    if (!password) newErrors.password = 'Vui lòng nhập mật khẩu';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await loginMutation.mutateAsync({ email, password });
      navigate('/dashboard');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
      setErrors({ general: errorMessage });
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
      >
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-600" />
        
        {/* Animated shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0],
              rotate: [0, 180, 360],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-20 -left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              x: [0, -80, 0],
              y: [0, 80, 0],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
            className="absolute -bottom-40 -right-20 w-[500px] h-[500px] bg-secondary-500/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute top-1/3 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-2xl"
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
              Học trực tuyến
              <br />
              <span className="text-secondary-300">mọi lúc, mọi nơi</span>
            </h1>

            <p className="text-lg text-white/80 max-w-md mb-8">
              Nền tảng học tập trực tuyến hiện đại với video call chất lượng cao,
              quản lý lớp học thông minh và trải nghiệm học tập tuyệt vời.
            </p>

            {/* Features */}
            <div className="space-y-4">
              {[
                'Video call HD với WebRTC',
                'Quản lý bài tập và chấm điểm tự động',
                'Thảo luận và chat real-time',
                'Theo dõi tiến độ học tập',
              ].map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="h-2 w-2 rounded-full bg-secondary-400" />
                  <span className="text-white/90">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right side - Login form */}
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
                Chào mừng trở lại!
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 mt-2">
                Đăng nhập để tiếp tục học tập
              </p>
            </div>

            {/* Social login */}
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
                  hoặc đăng nhập với email
                </span>
              </div>
            </div>

            {/* Login form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {errors.general && (
                <div className="p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg">
                  <p className="text-sm text-error-600 dark:text-error-400">{errors.general}</p>
                </div>
              )}

              <Input
                label="Email"
                type="email"
                placeholder="name@example.com"
                leftIcon={<Mail className="h-4 w-4" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
              />

              <Input
                label="Mật khẩu"
                type="password"
                placeholder="••••••••"
                leftIcon={<Lock className="h-4 w-4" />}
                showPasswordToggle
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
              />

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    Ghi nhớ đăng nhập
                  </span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
                >
                  Quên mật khẩu?
                </Link>
              </div>

              <Button
                type="submit"
                fullWidth
                size="lg"
                isLoading={loginMutation.isPending}
                rightIcon={!loginMutation.isPending && <ArrowRight className="h-4 w-4" />}
              >
                Đăng nhập
              </Button>
            </form>

            <p className="text-center text-sm text-neutral-600 dark:text-neutral-400 mt-6">
              Chưa có tài khoản?{' '}
              <Link
                to="/register"
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
              >
                Đăng ký ngay
              </Link>
            </p>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
