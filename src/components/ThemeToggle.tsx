'use client';

import { useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themes = [
    { value: 'light' as const, label: '浅色', icon: Sun },
    { value: 'dark' as const, label: '深色', icon: Moon },
    { value: 'system' as const, label: '跟随系统', icon: Monitor },
  ];

  const currentTheme = themes.find(t => t.value === theme) || themes[2];
  const CurrentIcon = currentTheme.icon;

  return (
    <div className="relative">
      {/* 主题切换按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary hover:bg-accent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring"
        title={`当前主题: ${currentTheme.label}`}
      >
        <CurrentIcon className="h-5 w-5 text-foreground" />
      </button>

      {/* 主题选择下拉菜单 */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-40 bg-popover border border-border rounded-lg shadow-lg z-50 animate-slide-in">
          <div className="p-1">
            {themes.map((themeOption) => {
              const Icon = themeOption.icon;
              const isSelected = theme === themeOption.value;
              
              return (
                <button
                  key={themeOption.value}
                  onClick={() => {
                    setTheme(themeOption.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-left rounded-md transition-colors duration-150 ${
                    isSelected 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-accent text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">{themeOption.label}</span>
                  {isSelected && (
                    <div className="ml-auto w-2 h-2 bg-current rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
