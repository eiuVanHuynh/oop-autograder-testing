// Nút icon vuông dùng cho cột hành động của mọi bảng (Edit / View / Duplicate…).
// Square icon button for the action column of every table.
//
//   <IconButton icon={Pencil} title="Edit" onClick={fn} />
export default function IconButton({ icon: Icon, title, onClick, danger, disabled, size = 16, type = "button" }) {
  return (
    <button
      type={type}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`p-2 text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed ${
        danger ? "hover:text-red-600" : "hover:text-brand-600"
      }`}
    >
      <Icon size={size} />
    </button>
  );
}
