'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center w-5 h-5 rounded-full hover:bg-accent/50 transition-colors duration-200 focus:outline-none"
      title={`切换到${resolvedTheme === 'dark' ? '浅色' : '深色'}模式`}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors duration-200" />
      ) : (
        <Moon className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors duration-200" />
      )}
    </button>
  );
}
