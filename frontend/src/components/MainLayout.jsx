import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./layout/Sidebar";
import TopBar from "./layout/TopBar";

export default function MainLayout() {
  // Màn hẹp (chia đôi màn hình, mobile — issue #76) mở sẵn sidebar thì nội dung chỉ còn một dải,
  // nên ở đó sidebar bắt đầu ở trạng thái thu gọn. Đọc một lần khi dựng, không theo dõi resize:
  // sau đó người dùng tự bật/tắt và ta không ghi đè lựa chọn của họ.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 1024,
  );
  const { pathname } = useLocation();

  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900 overflow-hidden">
      {/* TopBar nằm cố định trên cùng */}
      <TopBar
        collapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
      />

      {/* relative: dưới lg sidebar nằm đè lên nội dung thay vì ép nội dung co lại. */}
      <div className="relative flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} />

        {/* Nền mờ chỉ có ở màn hẹp, bấm vào là đóng sidebar. */}
        {!sidebarCollapsed && (
          <button
            type="button"
            aria-label="Đóng sidebar"
            onClick={() => setSidebarCollapsed(true)}
            className="absolute inset-0 z-30 bg-black/40 lg:hidden"
          />
        )}

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
