import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./layout/Sidebar";
import TopBar from "./layout/TopBar";

export default function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900 overflow-hidden">
      {/* TopBar nằm cố định trên cùng */}
      <TopBar
        collapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} />

        {/* Chỉ phần nội dung này mới có thanh cuộn riêng khi dài */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          {/* key = đường dẫn: đổi route là khối này dựng lại, nên hoạt ảnh chạy lại từ đầu. */}
          <div key={pathname} className="animate-page-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
