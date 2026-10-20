import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, History, Users, PlusCircle, FileText } from 'lucide-react';
import { useAuth } from '../../controllers/AuthContext';

// Menu chia hai nhóm đúng bản thiết kế v3. `roles` quyết định mục nào hiện với vai trò nào.
// Menu split into the two groups from design v3. `roles` decides which item each role sees.
// Bảng này là nguồn chuẩn của sidebar — thêm trang mới thì thêm một dòng ở đây.
// This table is the sidebar's source of truth — add a row here when adding a page.
export const MENU = [
  {
    group: 'CORE MODULES',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Tester', 'Dev', 'Viewer'] },
      { path: '/tests/new', label: 'Create Test', icon: PlusCircle, roles: ['Admin', 'Tester'] },
      { path: '/templates', label: 'Templates', icon: FileText, roles: ['Admin', 'Tester', 'Dev', 'Viewer'] },
      // match: tiền tố để /runs/:id vẫn làm sáng mục History.
      // match: prefix so /runs/:id still highlights the History item.
      { path: '/history', label: 'History', icon: History, roles: ['Admin', 'Tester', 'Dev', 'Viewer'], match: ['/history', '/runs'] },
    ],
  },
  {
    group: 'ADMINISTRATION',
    items: [{ path: '/admin/users', label: 'User Management', icon: Users, roles: ['Admin'], badge: 'Admin' }],
  },
];

// Cần làm / To do:
// - Logo: ô vuông bo tròn nền brand-600 chữ "OG" + tên "OOP Grader" (ảnh 04-dashboard).
// - Mỗi nhóm: tiêu đề nhóm chữ nhỏ màu xám, rồi danh sách nút.
// - Lọc item theo user.role trước khi render; nhóm không còn item nào thì ẩn luôn.
// - Mục đang mở: nền brand-600 chữ trắng; dùng `match` (nếu có) hoặc `path` để so với URL.
// - Dưới cùng chỉ khi chạy dev (`import.meta.env.DEV`): select đổi vai trò nhanh để thử phân quyền.
// - KHÔNG đặt avatar + logout ở đây, yêu cầu v3 đã chuyển sang TopBar.
export default function Sidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col">
      {/* TODO: logo */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        {/* TODO: render MENU theo nhóm, lọc theo vai trò, tô sáng mục đang mở */}
      </nav>
      {/* TODO: select đổi vai trò, chỉ hiện ở bản dev */}
    </aside>
  );
}
