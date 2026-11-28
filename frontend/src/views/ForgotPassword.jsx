// Trang quên mật khẩu, vào từ link "Forgot password?" ở Login.
// Forgot-password page, reached from the "Forgot password?" link on Login.
//
// KHÔNG có form gửi email ở đây, và đó là chủ ý: nhóm chốt không dùng dịch vụ ngoài nên backend
// không có email service, `POST /auth/forgot-password` và `/auth/reset-password` không được nối
// route (api-endpoints.md mục 1). Trang này trước đây có ô email và toast "Reset link sent!" —
// một lời hứa giả: không email nào được gửi, người dùng ngồi chờ mãi.
//
// Đường đặt lại mật khẩu thật của hệ thống:
//   - Admin: trang Users → ⋯ → Reset password (PATCH /users/:id/password)
//   - Người dùng còn nhớ mật khẩu: menu avatar → Change password (PATCH /users/me/password)

import { Link } from "react-router-dom";
import { ArrowLeft, Info, KeyRound, Mail } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import AuthCard from "../components/ui/AuthCard";

const Step = ({ icon: Icon, children }) => (
  <li className="flex items-start gap-2.5">
    <Icon size={16} className="mt-0.5 shrink-0 text-brand-600" />
    <span>{children}</span>
  </li>
);

export default function ForgotPassword() {
  return (
    <AuthLayout>
      <AuthCard
        title="Forgot password?"
        subtitle="Password resets are done by an administrator, not by email."
      >
        <div className="flex items-start gap-2 rounded-lg bg-brand-50 p-3 text-sm text-slate-700">
          <Info size={16} className="mt-0.5 shrink-0 text-brand-600" />
          <p className="m-0">
            This platform does not send password-reset emails. An administrator
            sets a temporary password for you.
          </p>
        </div>

        <ul className="mt-4 space-y-3 text-sm text-slate-700">
          <Step icon={Mail}>
            Contact an administrator of the platform and ask them to reset your
            password. They will give you a temporary one.
          </Step>
          <Step icon={KeyRound}>
            Sign in with that temporary password, then change it right away from
            the avatar menu → <span className="font-semibold">Change password</span>.
          </Step>
        </ul>

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
