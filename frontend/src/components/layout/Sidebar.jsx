import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  History,
  Users,
  Play,
  FileText,
  ListChecks,
} from "lucide-react";
import { useAuth } from "../../controllers/AuthContext";

// Menu chia hai nhóm đúng bản thiết kế v3. `roles` quyết định mục nào hiện với vai trò nào.
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
        path: "/testcases",
        label: "Test Cases",
        icon: ListChecks,
        roles: ["Admin", "Tester", "Dev", "Viewer"],
      },
      {
        path: "/tests/new",
        label: "Run Test",
        icon: Play,
        roles: ["Admin", "Tester"],
      },
      {
        path: "/templates",
        label: "Templates",
        icon: FileText,
        roles: ["Admin", "Tester", "Dev", "Viewer"],
      },
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

export const isActive = (item, pathname) =>
  (item.match ?? [item.path]).some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

export default function Sidebar({ collapsed = false }) {
  const { user } = useAuth();
  const { pathname } = useLocation();

  // Lọc theo vai trò; nhóm không còn mục nào thì ẩn luôn.
  const groups = MENU.map((g) => ({
    ...g,
    items: g.items.filter((item) => item.roles.includes(user?.role)),
  })).filter((g) => g.items.length > 0);

  return (
    <aside
      inert={collapsed}
      aria-hidden={collapsed || undefined}
      className={`relative z-40 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-in-out shrink-0 sticky top-0 h-[calc(100vh-4rem)] overflow-y-auto ${
        collapsed
          ? "w-0 overflow-hidden border-r-0 opacity-0"
          : "w-48 opacity-100"
      }`}
    >
      {/* Danh sách các mục menu */}
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
                              : "bg-brand-100 text-violet-600"
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
  );
}
