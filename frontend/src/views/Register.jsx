import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Mail, User } from "lucide-react";
import toast from "react-hot-toast";
import { FcGoogle } from "react-icons/fc";
import AuthLayout from "../components/AuthLayout";
import AuthCard from "../components/ui/AuthCard";
import FormField from "../components/ui/FormField";
import PasswordField from "../components/ui/PasswordField";
import Button from "../components/ui/Button";
import { registerRequest, getErrorMessage } from "../services/authService";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      toast.error("Please fill in all fields!");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Password confirmation does not match!");
      return;
    }
    // Khớp registerSchema của backend (password min 6, fullName min 2) để không phải chịu 400.
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long!");
      return;
    }

    setSaving(true);
    try {
      // Backend trả luôn token, nhưng ở đây KHÔNG tự đăng nhập: AuthContext chỉ nhận phiên
      // qua trang Login, tự ghi storage ở đây là làm hai nơi cùng giữ phiên.
      await registerRequest({ fullName: name, email, password });
      toast.success("Registration successful! Default role is Viewer.");
      navigate("/login");
    } catch (err) {
      toast.error(getErrorMessage(err, "Cannot create the account."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard
        title="Create Account"
        subtitle="Sign up to join the OOP Grader platform."
      >
        <form onSubmit={handleRegister} className="space-y-4">
          <FormField
            id="name"
            label="Full Name"
            icon={User}
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Nguyễn Văn A"
          />
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Create a password"
          />
          <PasswordField
            id="confirmPassword"
            label="Confirm Password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Confirm your password"
          />

          {/* Badge vai trò Viewer theo Design.md: nền slate-100, chữ slate-500 */}
          <p className="flex items-center gap-2 text-xs text-slate-500">
            New accounts start with the
            <span className="inline-flex h-[22px] items-center rounded-full bg-slate-100 px-2 text-[11px] font-semibold text-slate-500">
              Viewer
            </span>
            role.
          </p>

          <Button type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create account"} <ArrowRight size={16} />
          </Button>
        </form>
        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-500">Or register with</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        {/* BACKEND-TODO: dùng chung GET /auth/google — callback tự tạo tài khoản nếu chưa có. */}
        <Button
          variant="secondary"
          type="button"
          onClick={() => toast("Google sign-up is not available yet")}
        >
          <FcGoogle size={18} /> Google
        </Button>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-brand-600 hover:text-brand-700 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}
