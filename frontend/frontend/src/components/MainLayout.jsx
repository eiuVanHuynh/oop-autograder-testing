import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, History, Users, PlusCircle, LogOut, Shield } from 'lucide-react'; // 1. Thêm PlusCircle vào đây
import { useAuth } from '../controllers/AuthContext';

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['Admin', 'Tester', 'Dev', 'Viewer'],
    },
    {
      path: '/history',
      label: 'Test History',
      icon: History,
      roles: ['Admin', 'Tester', 'Dev', 'Viewer'],
    },
    {
      path: '/tests/new', // 2. Thêm đường dẫn tới trang tạo test mới
      label: 'New Test',
      icon: PlusCircle,
      roles: ['Admin', 'Tester', 'Dev', 'Viewer'],
    },
    { path: '/admin/users', label: 'User Management', icon: Users, roles: ['Admin'] },
  ];

  const filteredMenu = menuItems.filter((item) => item.roles.includes(user?.role));

  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900">
      {/* Sidebar bên trái */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between p-6">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold text-lg">
              AT
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">AutoTest</h1>
              <p className="text-xs text-gray-500">OOP Platform</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {filteredMenu.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition duration-200 ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Phần dưới cùng của Sidebar: Tên user, vai trò và nút Logout */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate">{user?.name || 'User'}</p>
              <div className="flex items-center gap-1 text-xs text-purple-600 font-medium">
                <Shield size={12} />
                <span>{user?.role || 'Viewer'}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-gray-200 text-red-600 hover:bg-red-50 text-sm font-medium transition duration-200 cursor-pointer"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Nội dung trang chính bên phải */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {menuItems.find((i) => i.path === location.pathname)?.label || 'Dashboard'}
          </h2>
        </header>

        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
