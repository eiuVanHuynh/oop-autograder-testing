import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronDown, LogOut, Menu, Search, User } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../controllers/AuthContext";
import { MENU, isActive } from "./Sidebar";

// Badge vai trò theo Design.md (Admin tím, Tester xanh dương, Dev xanh ngọc, Viewer xám).
const ROLE_BADGE = {
  Admin: "bg-brand-100 text-violet-600",
  Tester: "bg-blue-100 text-blue-600",
  Dev: "bg-teal-100 text-teal-700",
  Viewer: "bg-slate-100 text-slate-500",
};

// Tên trang hiện tại, lấy từ MENU cho khỏi khai báo hai nơi.
const pageTitle = (pathname) =>
  MENU.flatMap((g) => g.items).find((item) => isActive(item, pathname))
    ?.label ?? "";

// Thanh trên cùng. Logout nằm ở menu avatar tại đây, không còn ở sidebar (yêu cầu v3).
// Top bar. Logout lives in the avatar menu here, no longer in the sidebar (v3 requirement).
// onMenuClick: mở drawer của Sidebar trên màn hình nhỏ.
export default function TopBar({ onMenuClick = () => {} }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [keyword, setKeyword] = useState("");

  // Bấm Esc cũng đóng menu avatar.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

  // Chưa có API tìm kiếm toàn cục nên chỉ báo cho người dùng biết.
  const handleSearch = (e) => {
    e.preventDefault();
    if (keyword.trim()) toast("Global search is not available yet");
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
      {/* Nút mở menu: chỉ hiện khi sidebar đang là drawer */}
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
      >
        <Menu size={20} />
      </button>

      {/* Breadcrumb */}
      <p className="m-0 hidden shrink-0 text-sm text-slate-500 sm:block">
        OOP Grader <span className="mx-1 text-slate-300">/</span>
        <span className="font-medium text-slate-900">
          {pageTitle(pathname)}
        </span>
      </p>

      {/* Ô tìm kiếm */}
      <form
        onSubmit={handleSearch}
        className="relative ml-4 hidden w-full max-w-md md:block"
      >
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Search submissions, student ID..."
          className="h-10 w-full rounded-lg bg-brand-50 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600"
        />
      </form>

      <div className="flex-1" />

      {/* Chỉ trang trí, chưa có API: xóa hai khối dưới đây nếu không cần */}
      <span className="hidden items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 font-mono text-[11px] text-slate-600 xl:inline-flex">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        Cluster v2.4 Online
      </span>
      <button
        type="button"
        onClick={() => toast("No new notifications")}
        aria-label="Notifications"
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
      >
        <Bell size={18} />
      </button>

      {/* Menu avatar */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="flex items-center gap-1 rounded-full p-1 hover:bg-slate-100"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white">
            <User size={18} />
          </span>
          <ChevronDown size={14} className="text-slate-500" />
        </button>

        {menuOpen && (
          <>
            {/* Lớp trong suốt phủ màn hình: bấm ra ngoài thì đóng menu */}
            <div
              className="fixed inset-0 z-30"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
            <div
              role="menu"
              className="absolute right-0 z-40 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-md"
            >
              <div className="px-3 py-2">
                <p className="m-0 truncate text-sm font-semibold text-slate-900">
                  {user?.name}
                </p>
                <p className="m-0 truncate text-xs text-slate-500">
                  {user?.email}
                </p>
                <span
                  className={`mt-2 inline-flex h-[22px] items-center rounded-full px-2 text-[11px] font-semibold ${
                    ROLE_BADGE[user?.role] ?? ROLE_BADGE.Viewer
                  }`}
                >
                  {user?.role}
                </span>
              </div>
              <div className="my-1 h-px bg-slate-200" />
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex h-9 w-full items-center gap-2 rounded-md px-3 text-sm font-medium text-red-600 hover:bg-red-100"
              >
                <LogOut size={16} /> Log out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
