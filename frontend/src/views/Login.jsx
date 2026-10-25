import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Mail } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import toast from "react-hot-toast";
import { useAuth } from "../controllers/AuthContext";
import { getErrorMessage, loginRequest } from "../services/authService";
import AuthLayout from "../components/AuthLayout"
import AuthCard from "../components/ui/AuthCard";
import FormField from "../components/ui/FormField";
import PasswordField from "../components/ui/PasswordField";
import Button from "../components/ui/Button";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields!");
      return;
    }

    // BACKEND-TODO: POST /auth/login { email, password, rememberMe } -> { token, user }
    //   Lỗi: 400 sai dữ liệu · 401 sai mật khẩu · 423 tài khoản bị khóa · 429 thử quá nhiều lần.
    //   user.role phải là 'Admin' | 'Tester' | 'Dev' | 'Viewer' (khớp ALL_ROLES ở AppRoutes).
    //   rememberMe: backend quyết định hạn token; FE chọn localStorage / sessionStorage.
    setLoading(true);
    try {
      // POST /auth/login -> { token, user }. Lỗi: 400, 401, 423 (429 chưa có ở backend).
      const { token, user } = await loginRequest({ email, password });
      // rememberMe: FE chọn nơi lưu token. BACKEND-TODO: backend chưa nhận rememberMe (token luôn 1 ngày).
      login(user, token, rememberMe);
      toast.success("Login successful!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(getErrorMessage(err, "Login failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard title="Welcome Back" subtitle="Sign in to access OOP Grader.">
        <form onSubmit={handleLogin} className="space-y-4">
          <FormField
            id="email"
            label="Academic / Work Email"
            icon={Mail}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="john.doe@university.edu"
          />
          <PasswordField
            id="password"
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
          />

          {/* Remember me + Forgot password */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex cursor-pointer items-center gap-2 text-slate-900">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-[18px] w-[18px] cursor-pointer rounded accent-brand-600"
              />
              Remember me
            </label>
            <Link
              to="/forgot-password"
              className="font-semibold text-brand-600 hover:text-brand-700 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit">
            Sign in <ArrowRight size={16} />
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-500">Or continue with</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        {/* BACKEND-TODO: GET /auth/google (302 sang Google). Callback về Dashboard do backend xử lý.
            Khi xong: onClick = () => (window.location.href = `${API_URL}/auth/google`). */}
        <Button
          variant="secondary"
          type="button"
          onClick={() => toast("Google sign-in is not available yet")}
        >
          <FcGoogle size={18} /> Google
        </Button>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don't have a test account?{" "}
          <Link
            to="/register"
            className="font-semibold text-brand-600 hover:text-brand-700 hover:underline"
          >
            Register now
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}
