import { Plus } from "lucide-react";

export default function CreateButton({ onClick, ...props }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-brand-500/20 flex items-center gap-2 shrink-0 transition cursor-pointer"
      {...props}
    >
      <Plus size={16} />
      <span>Create</span>
    </button>
  );
}
