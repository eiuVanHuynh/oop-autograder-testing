import { useState } from 'react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../controllers/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields!');
      return;
    }

    const fakeUser = { name: 'Nguyễn Văn A', email, role: 'Admin' };
    login(fakeUser, 'fake-jwt-token');
    toast.success('Login successful!');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 w-full">
      <div className="max-w-md w-full bg-white dark:bg-[#1f2028] rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-[#2e303a] text-left">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Automated Testing System
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Automated OOP Testing Platform
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Mail size={18} />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10 w-full px-3 py-2.5 bg-gray-50 dark:bg-[#16171d] border border-gray-300 dark:border-[#2e303a] rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-gray-100 text-sm"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-10 pr-10 w-full px-3 py-2.5 bg-gray-50 dark:bg-[#16171d] border border-gray-300 dark:border-[#2e303a] rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-gray-100 text-sm"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Remember me</span>
            </label>
            <a
              href="#forgot"
              onClick={(e) => {
                e.preventDefault();
                toast('Password reset feature is under development!');
              }}
              className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
            >
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition duration-200 shadow-lg shadow-purple-500/25"
          >
            Login
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          Don't have an account?{' '}
          <a
            href="/register"
            className="text-purple-600 dark:text-purple-400 font-semibold hover:underline"
          >
            Sign up now!
          </a>
        </p>
      </div>
    </div>
  );
}
