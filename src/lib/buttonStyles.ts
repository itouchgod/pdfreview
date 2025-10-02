// 共享的按钮样式工具函数
export interface ButtonStyleConfig {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'glass' | 'simple';
  disabled?: boolean;
}

// 基础玻璃效果样式
export const getGlassButtonBaseStyles = (size: 'sm' | 'md' | 'lg' = 'md') => {
  const sizeMap = {
    sm: 'w-6 h-6',
    md: 'w-7 h-7', 
    lg: 'w-8 h-8'
  };

  return {
    className: `group relative ${sizeMap[size]} rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95`,
    style: {
      background: 'rgba(248, 250, 252, 0.8)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid rgba(51, 65, 85, 0.15)',
      boxShadow: '0 2px 8px rgba(51, 65, 85, 0.1)'
    }
  };
};

// 悬停样式
export const getGlassButtonHoverStyles = () => ({
  background: 'rgba(30, 58, 138, 0.1)',
  border: '1px solid rgba(30, 58, 138, 0.3)',
  boxShadow: '0 3px 12px rgba(30, 58, 138, 0.2)'
});

// 悬停事件处理器
export const createGlassButtonHandlers = () => ({
  onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!e.currentTarget.disabled) {
      const hoverStyles = getGlassButtonHoverStyles();
      Object.assign(e.currentTarget.style, hoverStyles);
    }
  },
  onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
    const baseStyles = getGlassButtonBaseStyles().style;
    Object.assign(e.currentTarget.style, baseStyles);
  }
});

// 图标样式
export const getIconStyles = (size: 'sm' | 'md' | 'lg' = 'md') => {
  const sizeMap = {
    sm: 'w-3 h-3',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return `relative ${sizeMap[size]} transition-all duration-200 group-hover:text-slate-800`;
};

// 页码显示样式
export const getPageNumberStyles = () => ({
  className: 'text-xs text-muted-foreground px-2 py-1 bg-card rounded-full',
  style: {}
});
