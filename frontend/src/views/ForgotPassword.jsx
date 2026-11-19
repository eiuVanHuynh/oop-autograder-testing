// Trang quên mật khẩu, vào từ link "Forgot password?" ở Login.
// Forgot-password page, reached from the "Forgot password?" link on Login.
//
// Cần làm / To do:
// - Form 1 ô email + nút "Gửi link đặt lại"; báo lỗi / báo thành công bằng react-hot-toast.
// - Link "← Quay lại đăng nhập" về /login.
// - Gọi API khi backend xong; trước đó chỉ cần toast giả lập.

import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Mail } from "lucide-react";
import toast from "react-hot-toast";
import AuthLayout from "../components/AuthLayout";
import AuthCard from "../components/ui/AuthCard";
import FormField from "../components/ui/FormField";
import Button from "../components/ui/Button";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email!");
      return;
    }
    // BACKEND-TODO: POST /auth/forgot-password { email } -> luôn 200 (kể cả email không tồn tại).
    //   Lỗi: 400 email sai định dạng · 429 gửi quá nhiều. Gọi API ở đây rồi mới setSent(true).
    //   Backend còn cần dịch vụ gửi email (SMTP) và trang đặt mật khẩu mới (POST /auth/reset-password,
    //   link trong email trỏ tới route FE chưa có: /reset-password?token=...). Làm sau.
    setSent(true);
    toast.success("Reset link sent!");
  };

  return (
    <AuthLayout>
      <AuthCard
        title="Forgot password?"
        subtitle="Enter your email and we'll send you a link to reset your password."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Passed: chữ green-600 trên nền green-100 (Design.md) */}
          {sent && (
            <div className="flex items-start gap-2 rounded-lg bg-green-100 p-3 text-sm text-green-600">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <p>
                If an account exists for{" "}
                <span className="font-semibold">{email}</span>, a reset link has
                been sent.
              </p>
            </div>
          )}

          <Button type="submit">
            Send reset link <ArrowRight size={16} />
          </Button>
        </form>

        <Link
          to="/login"
          className="mt-6 flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 hover:underline"
        >
          <ArrowLeft size={16} /> Back to sign in
        </Link>
      </AuthCard>
    </AuthLayout>
  );
}
