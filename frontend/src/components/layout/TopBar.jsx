import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../controllers/AuthContext';

// Thanh trên cùng. Logout nằm ở menu avatar tại đây, không còn ở sidebar (yêu cầu v3).
// Top bar. Logout lives in the avatar menu here, no longer in the sidebar (v3 requirement).
//
// Cần làm / To do:
// - Trái: ô tìm kiếm toàn cục. Phải: badge trạng thái cluster, chuông thông báo, menu avatar.
// - Menu avatar mở bằng useState, bên trong có tên + vai trò + nút Đăng xuất.
//   Nhớ cho đóng khi bấm ra ngoài (một <div className="fixed inset-0" /> phía dưới là đủ).
// - Đăng xuất: gọi logout() rồi navigate('/login').
export default function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="h-16 shrink-0 bg-white border-b border-gray-200 px-6 flex items-center gap-4">
      {/* TODO: ô tìm kiếm */}
      <div className="flex-1" />
      {/* TODO: badge cluster, chuông, menu avatar có nút Đăng xuất */}
    </header>
  );
}
