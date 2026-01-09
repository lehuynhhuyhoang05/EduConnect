import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, User, UserPlus, Loader2 } from 'lucide-react';
import { useRegister } from '../../hooks/useAuth';

export function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'STUDENT' as 'STUDENT' | 'TEACHER',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const register = useRegister();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (formData.password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    // Validate password format (uppercase, lowercase, number)
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      setError('Mật khẩu phải chứa chữ hoa, chữ thường và số');
      return;
    }

    try {
      await register.mutateAsync({
        fullName: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-500 via-secondary-600 to-primary-600 flex items-center justify-center p-4">
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
          <p className="text-white/80">Nền tảng học tập trực tuyến</p>
        </div>

        {/* Register Card */}
        <div className="bg-white dark:bg-neutral-800 rounded-3xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            Tạo tài khoản mới
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            Tham gia cùng hàng nghìn học viên
          </p>

          {error && (
            <div className="mb-4 p-3 bg-error-50 dark:bg-error-500/20 border border-error-200 dark:border-error-500/30 rounded-xl text-error-600 dark:text-error-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Họ và tên
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Nguyễn Văn A"
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-neutral-900 dark:text-white placeholder-neutral-400"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-neutral-900 dark:text-white placeholder-neutral-400"
                  required
                />
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Vai trò
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-neutral-900 dark:text-white"
              >
                <option value="STUDENT">Học sinh / Sinh viên</option>
                <option value="TEACHER">Giáo viên / Giảng viên</option>
              </select>
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
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
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

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-neutral-900 dark:text-white placeholder-neutral-400"
                  required
                />
              </div>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 mt-0.5 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                required
              />
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                Tôi đồng ý với{' '}
                <a href="#" className="text-primary-600 hover:underline">Điều khoản sử dụng</a>
                {' '}và{' '}
                <a href="#" className="text-primary-600 hover:underline">Chính sách bảo mật</a>
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={register.isPending}
              className="w-full py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-400 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {register.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang đăng ký...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Đăng ký
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-center text-neutral-600 dark:text-neutral-400 mt-6">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium">
              Đăng nhập
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-white/80 text-sm mt-6">
          Nhóm 14 - Môn Lập Trình Mạng
        </p>
      </motion.div>
    </div>
  );
}
