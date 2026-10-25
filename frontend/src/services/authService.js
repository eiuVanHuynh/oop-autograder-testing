import API from '../models/api';

// Backend: POST /auth/login -> { data: { token, user } }. Lỗi: { error: { code, message, details? } }.
// Hiện backend CHỈ có login. BACKEND-TODO: register, forgot-password, reset-password, me, logout.

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Backend trả nguyên dòng DB (snake_case, role chữ thường). FE cần { id, name, email, role: 'Admin' }.
// BACKEND-TODO: khi backend có utils/mappers.js thì bỏ hàm này.
export const toUser = (row) => ({
  id: row.user_id,
  name: row.full_name,
  email: row.email,
  role: capitalize(row.user_role), // 'admin' -> 'Admin' (khớp ALL_ROLES ở AppRoutes)
  status: row.user_status === 'active' ? 'Active' : 'Locked',
});

export async function loginRequest({ email, password }) {
  // BACKEND-TODO: rememberMe chưa được backend xử lý (token luôn 1 ngày), nên chưa gửi lên.
  const { data } = await API.post('/auth/login', { email, password });
  return { token: data.data.token, user: toUser(data.data.user) };
}

// Đổi lỗi API thành câu hiển thị (mã lỗi theo api-endpoints.md).
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error.response) return 'Cannot reach the server. Please try again.';
  const { status, data } = error.response;
  const apiError = data?.error;
  switch (status) {
    case 400:
      return apiError?.details?.[0]?.message || 'Invalid input.';
    case 401:
      return apiError?.code === 'INVALID_CREDENTIALS'
        ? 'Incorrect email or password.'
        : 'Please sign in again.';
    case 403:
      return 'You do not have permission to do this.';
    case 404:
      return 'Not found.';
    case 409:
      return apiError?.message || 'Conflict with existing data.';
    case 423:
      return 'This account is locked. Contact an administrator.';
    case 429:
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      return fallback;
  }
}
