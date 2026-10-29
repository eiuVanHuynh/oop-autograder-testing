// Ma trận phân quyền – nguồn chuẩn là SRS.md mục 4. 'Dev' chỉ được xem và request chạy lại.
// Permission matrix – source of truth is SRS.md section 4. 'Dev' may only view and request re-runs.
const WRITE_ROLES = ['Admin', 'Tester'];

export const canRunTest = (role) => WRITE_ROLES.includes(role); // Run / Chạy lại / Hủy — Run / re-run / cancel
export const canManageTemplates = (role) => WRITE_ROLES.includes(role); // Thêm / sửa / xóa Template — Create / edit / delete templates
export const canManageUsers = (role) => role === 'Admin'; // Quản lý thành viên — Member management
export const canManageCases = (role) => WRITE_ROLES.includes(role);