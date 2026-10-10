import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../controllers/AuthContext';
import Login from '../views/Login';
import Register from '../views/Register';
import MainLayout from '../components/MainLayout';
import History from '../views/History';
import UserManagement from '../views/UserManagement';
import TestCreation from '../views/TestCreation';
import TestReport from '../views/TestReport';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">403 - Access Denied</h1>
          <p className="text-gray-600">
            The role ({user.role}) is not allowed to access this resource.
          </p>
        </div>
      </div>
    );
  }
  return children;
};

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* MainLayout làm khung chung cho các trang sau khi đăng nhập */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['Admin', 'Tester', 'Dev', 'Viewer']}>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="dashboard"
          element={<div className="p-8 text-2xl font-bold">Automated Testing Dashboard</div>}
        />
        <Route path="history" element={<History />} />

        {/* Đưa 2 trang mới vào đây để có chung Sidebar & Logout */}
        <Route path="tests/new" element={<TestCreation />} />
        <Route path="runs/:id" element={<TestReport />} />

        <Route
          path="admin/users"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
