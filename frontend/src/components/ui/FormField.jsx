// Ô nhập có nhãn + icon bên trái.
// - trailing: phần tử đặt bên phải ô, ví dụ nút ẩn/hiện mật khẩu (tùy chọn)
// Mọi prop còn lại (type, value, onChange, placeholder...) chuyển thẳng vào <input>.
export default function FormField({
  id,
  label,
  icon: Icon,
  trailing,
  ...inputProps
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-slate-900">
          {label}
        </label>        
      </div>
      <div className="relative">
        <Icon
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          id={id}
          {...inputProps}
          className={`h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 ${trailing ? "pr-10" : "pr-3"}`}
        />
        {trailing}
      </div>
    </div>
  );
}
