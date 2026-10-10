import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../controllers/ThemeContext';

export default function ThemeToggleBtn() {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-[#2e303a] dark:hover:bg-[#3f424e] text-gray-700 dark:text-gray-200 transition duration-200 flex items-center justify-center shadow-sm cursor-pointer"
      title="Toggle Theme"
    >
      {isDarkMode ? (
        <Sun size={20} className="text-yellow-400" />
      ) : (
        <Moon size={20} className="text-purple-600" />
      )}
    </button>
  );
}
