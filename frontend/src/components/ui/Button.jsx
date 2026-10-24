// Nút theo Design.md: cao 40px, bo 8px, hover đổi nền, bấm giữ thì thu nhỏ nhẹ.
// variant: 'primary' (Indigo) | 'secondary' (nền trắng, viền hairline)
// Các prop còn lại (type, onClick, disabled...) chuyển thẳng vào <button>.
const VARIANTS = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  secondary: 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
};

export default function Button({ variant = 'primary', children, ...props }) {
  return (
    <button
      className={`flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]}`}
      {...props}
    >
      {children}
    </button>
  );
}