'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { PageCalculator } from '@/utils/pageCalculator';

interface DraggableFloatingButtonProps {
  currentPage: number;
  totalPages: number;
  selectedPDF: string;
  onPreviousPage: () => void;
  onNextPage: () => void;
  isPreviousDisabled: boolean;
  isNextDisabled: boolean;
}

interface Position {
  x: number;
  y: number;
}

export default function DraggableFloatingButton({
  currentPage,
  totalPages,
  selectedPDF,
  onPreviousPage,
  onNextPage,
  isPreviousDisabled,
  isNextDisabled
}: DraggableFloatingButtonProps) {
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const numberButtonRef = useRef<HTMLDivElement>(null);

  // 初始化位置 - 默认在右侧中央
  useEffect(() => {
    if (!isInitialized && typeof window !== 'undefined') {
      const savedPosition = localStorage.getItem('floating-button-position');
      if (savedPosition) {
        try {
          const parsed = JSON.parse(savedPosition);
          // 验证保存的位置是否仍然有效
          if (parsed.x >= 0 && parsed.y >= 0 && 
              parsed.x <= window.innerWidth - 100 && 
              parsed.y <= window.innerHeight - 200) {
            setPosition(parsed);
          } else {
            // 如果保存的位置无效，使用默认位置
            setPosition({ x: window.innerWidth - 100, y: window.innerHeight / 2 });
          }
        } catch {
          // 如果解析失败，使用默认位置
          setPosition({ x: window.innerWidth - 100, y: window.innerHeight / 2 });
        }
      } else {
        // 默认位置：右侧中央
        setPosition({ x: window.innerWidth - 100, y: window.innerHeight / 2 });
      }
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // 保存位置到localStorage
  const savePosition = useCallback((pos: Position) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('floating-button-position', JSON.stringify(pos));
    }
  }, []);

  // 重置到默认位置
  const resetToDefaultPosition = useCallback(() => {
    if (typeof window !== 'undefined') {
      const defaultPos = { x: window.innerWidth - 100, y: window.innerHeight / 2 };
      setPosition(defaultPos);
      savePosition(defaultPos);
    }
  }, [savePosition]);

  // 边界检测和调整
  const constrainPosition = useCallback((pos: Position): Position => {
    if (!containerRef.current) return pos;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const margin = 20; // 距离边缘的最小距离

    return {
      x: Math.max(margin, Math.min(window.innerWidth - rect.width - margin, pos.x)),
      y: Math.max(margin, Math.min(window.innerHeight - rect.height - margin, pos.y))
    };
  }, []);

  // 处理鼠标按下
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  }, [position]);

  // 处理鼠标移动
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const newPosition = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    };

    const constrainedPosition = constrainPosition(newPosition);
    setPosition(constrainedPosition);
  }, [isDragging, dragStart, constrainPosition]);

  // 处理鼠标释放
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      savePosition(position);
    }
  }, [isDragging, position, savePosition]);

  // 处理触摸开始
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    });
  }, [position]);

  // 处理触摸移动
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;

    const touch = e.touches[0];
    const newPosition = {
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    };

    const constrainedPosition = constrainPosition(newPosition);
    setPosition(constrainedPosition);
  }, [isDragging, dragStart, constrainPosition]);

  // 处理触摸结束
  const handleTouchEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      savePosition(position);
    }
  }, [isDragging, position, savePosition]);

  // 添加全局事件监听器
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // 窗口大小变化时重新调整位置
  useEffect(() => {
    const handleResize = () => {
      const constrainedPosition = constrainPosition(position);
      setPosition(constrainedPosition);
      savePosition(constrainedPosition);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position, constrainPosition, savePosition]);

  // 计算绝对页码
  const absolutePage = (() => {
    const calculator = PageCalculator.fromPath(selectedPDF);
    if (!calculator) return currentPage;
    return calculator.toAbsolutePage(currentPage);
  })();

  if (!isInitialized) {
    return null; // 避免闪烁
  }

  return (
    <div
      ref={containerRef}
      className="fixed z-50 animate-fade-in select-none"
      style={{
        left: position.x,
        top: position.y,
        transform: isDragging ? 'scale(1.05)' : 'scale(1)',
        transition: isDragging ? 'none' : 'transform 0.2s ease-out'
      }}
    >
      <div className="flex flex-col items-center space-y-3 sm:space-y-4 lg:space-y-5">
        {/* 上一页按钮 */}
        <button
          onClick={onPreviousPage}
          disabled={isPreviousDisabled}
          className="group w-11 h-11 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-card/95 hover:bg-card border border-border hover:border-primary rounded-2xl shadow-lg hover:shadow-primary/20 flex items-center justify-center text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 ease-out hover:scale-105 active:scale-95 backdrop-blur-sm"
          title="Previous Page (↑ or ←)"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 transition-all duration-300 group-hover:-translate-y-1 group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        
        {/* 页码显示区域 - 可拖动 */}
        <div
          ref={numberButtonRef}
          className="w-11 h-7 sm:w-12 sm:h-8 lg:w-14 lg:h-9 bg-primary/95 backdrop-blur-sm hover:bg-primary rounded-2xl shadow-lg hover:shadow-primary/20 flex items-center justify-center transition-all duration-300 hover:scale-105 cursor-move"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onDoubleClick={resetToDefaultPosition}
          title="拖拽移动位置，双击重置到默认位置"
          style={{
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
        >
          <span className="text-xs sm:text-xs lg:text-xs font-bold text-primary-foreground tracking-wide">
            {absolutePage}
          </span>
        </div>
        
        {/* 下一页按钮 */}
        <button
          onClick={onNextPage}
          disabled={isNextDisabled}
          className="group w-11 h-11 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-card/95 hover:bg-card border border-border hover:border-primary rounded-2xl shadow-lg hover:shadow-primary/20 flex items-center justify-center text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 ease-out hover:scale-105 active:scale-95 backdrop-blur-sm"
          title="Next Page (↓ or →)"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 transition-all duration-300 group-hover:translate-y-1 group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {/* 提示文字 */}
        <div className="hidden lg:block text-xs text-muted-foreground text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
          ↑↓ or ←→ to navigate
        </div>
      </div>
    </div>
  );
}
