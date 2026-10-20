import AuthLayout from '../components/AuthLayout';

// Trang quên mật khẩu, vào từ link "Forgot password?" ở Login.
// Forgot-password page, reached from the "Forgot password?" link on Login.
//
// Cần làm / To do:
// - Form 1 ô email + nút "Gửi link đặt lại"; báo lỗi / báo thành công bằng react-hot-toast.
// - Link "← Quay lại đăng nhập" về /login.
// - Gọi API khi backend xong; trước đó chỉ cần toast giả lập.
export default function ForgotPassword() {
  return (
    <AuthLayout>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <h2 className="text-2xl font-bold text-gray-900">Quên mật khẩu?</h2>
        {/* TODO: form email + nút gửi + link quay lại đăng nhập */}
      </div>
    </AuthLayout>
  );
}
