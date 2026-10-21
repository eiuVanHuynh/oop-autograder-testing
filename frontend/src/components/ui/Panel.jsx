// Khung thẻ trắng cho mọi khối nội dung (biểu đồ, bảng, form…).
// White card frame for every content block (chart, table, form…).
//
// Cần làm / To do:
// - header: icon + title bên trái, actions bên phải; không có title thì đừng render <h3> rỗng.
// - bodyClassName: để trang tự bỏ padding khi nhét bảng tràn viền.
export default function Panel({ icon, title, actions, children }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      {/* TODO: header (icon + title + actions) */}
      <div className="p-5">{children}</div>
    </section>
  );
}
