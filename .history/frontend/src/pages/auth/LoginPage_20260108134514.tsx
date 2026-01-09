import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import { useLogin } from '../../hooks/useAuth';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const login = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login.mutateAsync({ email, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">EduConnect</h1>
          <p className="text-primary-100">Nền tảng học tập trực tuyến</p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-neutral-800 rounded-3xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            Chào mừng trở lại!
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            Đăng nhập để tiếp tục học tập
          </p>

          {error && (
            <div className="mb-4 p-3 bg-error-50 dark:bg-error-500/20 border border-error-200 dark:border-error-500/30 rounded-xl text-error-600 dark:text-error-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-neutral-900 dark:text-white placeholder-neutral-400"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-neutral-900 dark:text-white placeholder-neutral-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Ghi nhớ đăng nhập</span>
              </label>
              <a href="#" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400">
                Quên mật khẩu?
              </a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={login.isPending}
              className="w-full py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-400 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {login.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang đăng nhập...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Đăng nhập
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200 dark:border-neutral-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-neutral-800 text-neutral-500">hoặc</span>
            </div>
          </div>

          {/* Register Link */}
          <p className="text-center text-neutral-600 dark:text-neutral-400">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium">
              Đăng ký ngay
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-primary-100 text-sm mt-6">
          Nhóm 14 - Môn Lập Trình Mạng
        </p>
      </motion.div>
    </div>
  );
}
