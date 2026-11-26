import { BrowserRouter as Router } from "react-router-dom";
import { useEffect } from "react";
import toast, { Toaster, ToastBar, useToasterStore } from "react-hot-toast";
import { X } from "lucide-react";
import { AuthProvider } from "./controllers/AuthContext";
import AppRoutes from "./routes/AppRoutes";

// Bấm ra ngoài (bất kỳ đâu) để tắt thông báo, khỏi phải chờ hết thời gian.
// Toast đang loading thì giữ lại.
function DismissToastsOnOutsideClick() {
  const { toasts } = useToasterStore();
  useEffect(() => {
    const onPointerDown = (e) => {
      toasts
        .filter((t) => t.visible && t.type !== "loading")
        .forEach((t) => toast.dismiss(t.id));
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [toasts]);
  return null;
}

/// Không đụng, trừ phi thên middleware
export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-right"
          containerStyle={{ top: 76 }} // nằm dưới TopBar, không che avatar/chuông
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
        >
          {(t) => (
            <ToastBar toast={t} className="app-toast">
              {({ icon, message }) => (
                <>
                  {icon}
                  {message}
                  {t.type !== "loading" && (
                    <button
                      type="button"
                      aria-label="Close notification"
                      onClick={() => toast.dismiss(t.id)}
                      className="ml-1 shrink-0 rounded-md p-1 opacity-80 hover:opacity-100 hover:bg-black/10 transition"
                    >
                      <X size={16} />
                    </button>
                  )}
                </>
              )}
            </ToastBar>
          )}
        </Toaster>
        <DismissToastsOnOutsideClick />
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
