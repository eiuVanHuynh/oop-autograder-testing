import { Outlet } from 'react-router-dom';
import Sidebar from './layout/Sidebar';
import TopBar from './layout/TopBar';

// Khung chung sau khi đăng nhập. Sửa menu thì vào Sidebar.jsx, sửa thanh trên thì vào TopBar.jsx.
// Shared frame for signed-in pages. Edit the menu in Sidebar.jsx, the top bar in TopBar.jsx.
export default function MainLayout() {
  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
