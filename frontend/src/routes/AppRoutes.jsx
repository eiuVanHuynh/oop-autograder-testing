import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../controllers/AuthContext";
import Login from "../views/Login";
import Register from "../views/Register";
import ForgotPassword from "../views/ForgotPassword";
import MainLayout from "../components/MainLayout";
import Dashboard from "../views/Dashboard";
import Templates from "../views/Templates";
import History from "../views/History";
import TestCreation from "../views/TestCreation";
import TestReport from "../views/TestReport";
import UserManagement from "../views/UserManagement";
import Forbidden from "../views/Forbidden";

const ALL_ROLES = ["Admin", "Tester", "Dev", "Viewer"]; // Check tên với back-end

// Chưa đăng nhập thì về /login; sai vai trò thì hiện trang 403 thay vì đá đi nơi khác.
// Not signed in → /login; wrong role → render the 403 page instead of redirecting elsewhere.
const ProtectedRoute = ({ children, allowedRoles }) => {
  // Tôi ví dụ sơ sơ
  const { user } = useAuth();

  if (!user)
    // Chưa đăng nhập
    return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role))
    // Thiếu quyền
    return <Forbidden />;

  return children;
};

// File này đã khai báo đủ route của bản thiết kế v3 — thêm trang mới thì mới cần sửa ở đây.
// This file already declares every route in design v3 — only edit it when adding a new page.
export default function AppRoutes() {
  return (
    <Routes>
      {/* Trước khi đăng nhập */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Các trang sau khi đăng nhập dùng chung Sidebar + TopBar. */}
      {/* Signed-in pages share the Sidebar + TopBar frame. */}
      <Route
        element={
          <ProtectedRoute allowedRoles={ALL_ROLES}>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="templates" element={<Templates />} />
        <Route path="history" element={<History />} />
        <Route path="runs/:id" element={<TestReport />} />

        <Route
          path="tests/new"
          element={
            <ProtectedRoute allowedRoles={["Admin", "Tester"]}>
              <TestCreation />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/users"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
