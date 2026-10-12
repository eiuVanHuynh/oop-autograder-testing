// Ma trận phân quyền (theo tài liệu thiết kế). 'Dev' là role cũ do Ngày 1 để lại, coi như Tester.
const WRITE_ROLES = ['Admin', 'Tester', 'Dev'];

export const canRunTest = (role) => WRITE_ROLES.includes(role); // Run / Chạy lại / Hủy
export const canManageTemplates = (role) => WRITE_ROLES.includes(role); // Thêm / sửa / xóa Template
export const canManageUsers = (role) => role === 'Admin';
