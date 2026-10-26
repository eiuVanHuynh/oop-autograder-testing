import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./layout/Sidebar";
import TopBar from "./layout/TopBar";

// Khung chung sau khi đăng nhập. Sửa menu thì vào Sidebar.jsx, sửa thanh trên thì vào TopBar.jsx.
// Shared frame for signed-in pages. Edit the menu in Sidebar.jsx, the top bar in TopBar.jsx.
// menuOpen chỉ ảnh hưởng màn hình nhỏ (< lg), nơi sidebar là drawer.
export default function MainLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenuClick={() => setMenuOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
