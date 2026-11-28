// Thẻ số liệu ở đầu Dashboard: icon, nhãn, con số, dòng phụ.
// Stat card at the top of Dashboard: icon, label, value, sub-line.
//
// Thay cho bản cũ cùng tên (đã xoá): bản đó bỏ qua sub/icon/tone/onClick và không trang nào
// dùng, còn Dashboard tự viết khối riêng. Đây là khối của Dashboard tách ra, nên nó là một
// thứ đang chạy thật, không phải một khung rỗng chờ người khác điền.
//
// tone: lớp màu của ô icon, truyền thẳng (vd "bg-emerald-100 text-emerald-600") vì Tailwind
// không sinh được class ghép chuỗi — cùng lý do với TONES trong StatusBadge.
export default function StatCard({ label, value, sub, icon: Icon, tone = "bg-brand-50 text-brand-600", onClick }) {
  // Bấm được thì phải là <button>, nếu không bàn phím không tới được.
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm ${
        onClick
          ? "cursor-pointer transition-colors hover:border-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          : ""
      }`}
    >
      {Icon && (
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          <Icon size={20} />
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-xs font-medium text-gray-500">{label}</span>
        {/* .metric: mono + tabular-nums (src/index.css) — cột số thẳng hàng, số không nhảy khi đếm. */}
        <span className="metric block text-2xl">{value}</span>
        {sub && <span className="block truncate text-xs text-gray-500">{sub}</span>}
      </span>
    </Tag>
  );
}
