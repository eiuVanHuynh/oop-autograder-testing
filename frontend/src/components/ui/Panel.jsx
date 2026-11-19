// Khung thẻ trắng cho mọi khối nội dung (biểu đồ, bảng, form…).
// White card frame for every content block (chart, table, form…).
//
// Cần làm / To do:
// - header: icon + title bên trái, actions bên phải; không có title thì đừng render <h3> rỗng.
// - bodyClassName: để trang tự bỏ padding khi nhét bảng tràn viền.
export default function Panel({ icon: Icon, title, actions, children, bodyClassName }) {
  const defaultPad = title ? 'px-4 pb-4 pt-4 sm:px-6 sm:pb-6' : 'p-4 sm:p-6';

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      {title && (
        <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-6">
          <h3 className="m-0 flex items-center gap-2 text-base font-semibold text-slate-900">
            {Icon && <Icon size={18} className="text-brand-600" />}
            {title}
          </h3>
          {actions}
        </div>
      )}
      <div className={bodyClassName ?? defaultPad}>{children}</div>
    </section>
  );
}
