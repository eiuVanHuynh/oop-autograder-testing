// Ma trận phân quyền – nguồn chuẩn là SRS.md mục 4. 'Dev' chỉ được xem và request chạy lại.
// Permission matrix – source of truth is SRS.md section 4. 'Dev' may only view and request re-runs.
const WRITE_ROLES = ['Admin', 'Tester'];

export const canRunTest = (role) => WRITE_ROLES.includes(role); // Run / Chạy lại / Hủy — Run / re-run / cancel

// Dev không tự chạy được nên XIN chạy lại; Admin/Tester vẫn chạy thẳng, không cần xin.
// Backend: POST /runs/:id/rerun-requests (admin, tester, dev) và .../approve|reject (admin, tester).
// Dev cannot run, so it ASKS for a re-run; Admin/Tester just re-run and never need to ask.
export const canRequestRerun = (role) => role === 'Dev';
export const canDecideRerun = canRunTest;
// Sửa lại một quyết định đã ghi (duyệt nhầm, duyệt rồi mà chưa chạy): chỉ Admin.
// Backend: PATCH /rerun-requests/:id yêu cầu role admin.
export const canResetRerunStatus = (role) => role === 'Admin';
export const canManageTemplates = (role) => WRITE_ROLES.includes(role); // Thêm / sửa / xóa Template — Create / edit / delete templates
export const canManageUsers = (role) => role === 'Admin'; // Quản lý thành viên — Member management
export const canManageCases = (role) => WRITE_ROLES.includes(role);