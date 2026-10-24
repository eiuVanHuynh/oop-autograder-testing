// Thẻ trắng + tiêu đề + dòng mô tả dùng chung cho Login / Register / ForgotPassword.
// m-0 ở h2 để ghi đè margin mặc định của rule h2 trong index.css.
export default function AuthCard({ title, subtitle, children }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
      <h2 className="m-0 text-2xl font-semibold leading-8 tracking-tight text-slate-900">
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}