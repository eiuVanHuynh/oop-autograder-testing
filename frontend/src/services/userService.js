import API from '../models/api';

// Nối với /api/users (Admin). GET trả { data, meta }; PATCH trả { data }.
// Dòng user đi qua utils/mappers.toApi nên là camelCase, enum vẫn chữ thường ('admin', 'active').

const toRow = (r = {}) => ({
  id: r.userId ?? r.user_id ?? r.id,
  name: r.fullName ?? r.full_name ?? '',
  email: r.email ?? '',
  role: String(r.userRole ?? r.user_role ?? 'viewer').toLowerCase(),
  status: String(r.userStatus ?? r.user_status ?? 'active').toLowerCase(),
});

export const listUsers = async (params = {}) =>
  ((await API.get('/users', { params })).data?.data ?? []).map(toRow);

// 400 nếu tự đổi chính mình, 409 ADMIN_PROTECTED nếu đụng vào tài khoản admin.
export const changeUserRole = async (id, role) =>
  toRow((await API.patch(`/users/${id}/role`, { role })).data.data);

// Khoá = 'inactive'.
export const changeUserStatus = async (id, status) =>
  toRow((await API.patch(`/users/${id}/status`, { status })).data.data);

// POST /users – Admin tạo tài khoản hộ. 409 EMAIL_TAKEN nếu email đã dùng
// (backend hạ chữ email trước khi ghi nên 'A@b.co' cũng tính là trùng).
export const createUser = async ({ name, email, password, role, status }) =>
  toRow(
    (await API.post('/users', { fullName: name, email, password, role, status }))
      .data.data,
  );

// PATCH /users/:id – chỉ họ tên / email. Vai trò và trạng thái dùng hai hàm ở trên.
export const updateUser = async (id, { name, email }) =>
  toRow((await API.patch(`/users/${id}`, { fullName: name, email })).data.data);

// DELETE /users/:id – 204, không có body. 400 nếu tự xoá mình, 409 nếu là admin.
export const deleteUser = (id) => API.delete(`/users/${id}`);
