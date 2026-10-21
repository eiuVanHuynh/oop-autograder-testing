import { useState } from 'react';
import { Lock, Mail, User, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleRegister = (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      toast.error('Please fill in all fields!');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Password confirmation does not match!');
      return;
    }

    toast.success('Registration successful! Default role is Viewer.');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 w-full py-8">
      <div className="max-w-md w-full bg-white dark:bg-[#1f2028] rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-[#2e303a] text-left">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create New Account</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sign up to join the automated testing platform</p>
        </div>
        
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <User size={18} />
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="pl-10 w-full px-3 py-2.5 bg-gray-50 dark:bg-[#16171d] border border-gray-300 dark:border-[#2e303a] rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-gray-100 text-sm"
                placeholder="Hehehe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="pl-10 w-full px-3 py-2.5 bg-gray-50 dark:bg-[#16171d] border border-gray-300 dark:border-[#2e303a] rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-gray-100 text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 bg-purple-50 dark:bg-[#16171d] p-3 rounded-xl border border-purple-100 dark:border-purple-900/30">
            💡 New accounts will automatically receive the <span className="font-semibold text-purple-600 dark:text-purple-400">Viewer</span> role.
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition duration-200 shadow-lg shadow-purple-500/25 mt-2"
          >
            Sign Up
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <a href="/login" className="text-purple-600 dark:text-purple-400 font-semibold hover:underline">Sign in now!</a>
        </p>
      </div>
    </div>
  );
}