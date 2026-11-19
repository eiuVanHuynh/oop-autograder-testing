import { BrowserRouter as Router } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./controllers/AuthContext";
import AppRoutes from "./routes/AppRoutes";

/// Không đụng, trừ phi thên middleware
export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            // Cấu hình chung cho tất cả các loại toast
            style: {
              padding: "12px 16px",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: "500",
            },
            // Riêng thông báo Thành công (success)
            success: {
              style: {
                background: "#10B981", // Nền xanh lá (emerald)
                color: "#FFFFFF", // Chữ trắng
              },
              iconTheme: {
                primary: "#FFFFFF",
                secondary: "#10B981",
              },
            },
            // Riêng thông báo Lỗi (error)
            error: {
              style: {
                background: "#EF4444", // Nền đỏ (red)
                color: "#FFFFFF", // Chữ trắng
              },
              iconTheme: {
                primary: "#FFFFFF",
                secondary: "#EF4444",
              },
            },
          }}
        />
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
