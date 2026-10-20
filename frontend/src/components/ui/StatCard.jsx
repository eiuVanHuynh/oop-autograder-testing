// Thẻ thống kê ở đầu Dashboard / History / Templates / Users.
// Stat card at the top of Dashboard / History / Templates / Users.
//
// Cần làm / To do:
// - value: số lớn in đậm; sub: dòng phụ nhỏ bên dưới (xu hướng, ví dụ "+12% tuần này").
// - icon: icon lucide trong ô bo tròn bên phải; tone đổi màu ô đó theo trạng thái.
// - Khi có onClick: render <button> thay vì <div>, nếu không bàn phím sẽ không bấm được.
export default function StatCard({ label, value, sub, icon, tone = 'brand', onClick }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
      {/* TODO: sub, icon theo tone (brand / green / red / amber) */}
    </div>
  );
}
