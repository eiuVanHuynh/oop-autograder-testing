import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  History,
  Users,
  PlusCircle,
  FileText,
  Terminal,
  X,
} from "lucide-react";
import { useAuth } from "../../controllers/AuthContext";

// Menu chia hai nhóm đúng bản thiết kế v3. `roles` quyết định mục nào hiện với vai trò nào.
// Menu split into the two groups from design v3. `roles` decides which item each role sees.
// Bảng này là nguồn chuẩn của sidebar — thêm trang mới thì thêm một dòng ở đây.
// This table is the sidebar's source of truth — add a row here when adding a page.
export const MENU = [
  {
    group: "CORE MODULES",
    items: [
      {
        path: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        roles: ["Admin", "Tester", "Dev", "Viewer"],
      },
      {
        path: "/tests/new",
        label: "Create Test",
        icon: PlusCircle,
        roles: ["Admin", "Tester"],
      },
      {
        path: "/templates",
        label: "Templates",
        icon: FileText,
        roles: ["Admin", "Tester", "Dev", "Viewer"],
      },
      // match: tiền tố để /runs/:id vẫn làm sáng mục History.
      // match: prefix so /runs/:id still highlights the History item.
      {
        path: "/history",
        label: "History",
        icon: History,
        roles: ["Admin", "Tester", "Dev", "Viewer"],
        match: ["/history", "/runs"],
      },
    ],
  },
  {
    group: "ADMINISTRATION",
    items: [
      {
        path: "/admin/users",
        label: "User Management",
        icon: Users,
        roles: ["Admin"],
        badge: "Admin",
      },
    ],
  },
];

// Mục menu có khớp URL hiện tại không (dùng cho sidebar và breadcrumb ở TopBar).
export const isActive = (item, pathname) =>
  (item.match ?? [item.path]).some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

// open / onClose chỉ dùng trên màn hình nhỏ (< lg), khi sidebar là drawer trượt ra từ trái.
export default function Sidebar({ open = false, onClose = () => {} }) {
  const { user } = useAuth();
  const { pathname } = useLocation();

  // Lọc theo vai trò; nhóm không còn mục nào thì ẩn luôn.
  const groups = MENU.map((g) => ({
    ...g,
    items: g.items.filter((item) => item.roles.includes(user?.role)),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      {/* Nền mờ phía sau drawer (chỉ màn hình nhỏ) */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Terminal size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-sm font-semibold leading-5 text-slate-900">
              OOP Grader
            </p>
            <p className="m-0 text-[11px] leading-4 text-slate-500">
              CI/CD Test Runner
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="shrink-0 text-slate-400 hover:text-slate-700 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto p-3">
          {groups.map((group) => (
            <div key={group.group}>
              <p className="m-0 mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {group.group}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(item, pathname);
                  const Icon = item.icon;
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        onClick={onClose}
                        aria-current={active ? "page" : undefined}
                        className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                          active
                            ? "bg-brand-600 text-white"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <Icon size={18} className="shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              active
                                ? "bg-white/20 text-white"
                                : "bg-purple-100 text-violet-600"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
