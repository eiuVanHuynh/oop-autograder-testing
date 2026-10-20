// Khung 2 cột cho Login / Register / Forgot password: hero thương hiệu bên trái, form bên phải.
// Two-column frame for Login / Register / Forgot password: brand hero left, form right.
//
// Cần làm / To do:
// - Cột trái: nền gradient brand-600 → brand-700, logo trên, khẩu hiệu + minh họa giữa, chân trang dưới.
//   Chỉ để trang trí nên ẩn dưới breakpoint lg.
// - Cột phải: canh giữa, bọc {children} trong khung rộng tối đa max-w-md.
export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-gray-50">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-brand-600 to-brand-700 text-white">
        {/* TODO: logo, khẩu hiệu, minh họa (ảnh 01-login / 02-forgot-password) */}
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
