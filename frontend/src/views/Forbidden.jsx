import PageHeader from '../components/ui/PageHeader';
import Panel from '../components/ui/Panel';

// Trang 403. ProtectedRoute trong AppRoutes render trang này khi vai trò không đủ quyền.
// The 403 page. ProtectedRoute in AppRoutes renders it when the role lacks permission.
//
// Cần làm / To do:
// - Khối chính: icon khiên đỏ, câu giải thích kèm vai trò hiện tại (useAuth), nút "Về Dashboard" + "Quay lại".
// - Ba thẻ phụ bên dưới: User context / Authorization scope / Privilege escalation (ảnh 10-403).
export default function Forbidden() {
  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader breadcrumb={['RBAC Security Gateway', 'HTTP 403']} title="Access Denied" />
      <Panel>{/* TODO: icon + lý do từ chối + 2 nút điều hướng */}</Panel>
      {/* TODO: 3 thẻ thông tin */}
    </div>
  );
}
