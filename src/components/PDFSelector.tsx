'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { PDF_CONFIG } from '@/config/pdf';

interface PDFSelectorProps {
  selectedPDF: string;
  onSelectPDF: (pdfPath: string, pdfName: string) => void;
}

export default function PDFSelector({ onSelectPDF, selectedPDF }: PDFSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 获取当前选中的章节
  const currentSection = PDF_CONFIG.sections.find(section => section.filePath === selectedPDF);
  
  // 获取当前选中项的索引
  useEffect(() => {
    const index = PDF_CONFIG.sections.findIndex(section => section.filePath === selectedPDF);
    setCurrentIndex(index >= 0 ? index : 0);
  }, [selectedPDF]);


  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 滚动到当前选中项
  useEffect(() => {
    if (isOpen && scrollContainerRef.current) {
      const itemHeight = 40; // 每个项目的高度（h-10 = 40px）
      const scrollTop = currentIndex * itemHeight;
      
      scrollContainerRef.current.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      });
    }
  }, [isOpen, currentIndex]);

  // 检查滚动状态
  const checkScrollStatus = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      setCanScrollUp(scrollTop > 0);
      setCanScrollDown(scrollTop < scrollHeight - clientHeight - 1);
    }
  };

  // 滚动处理函数
  const handleScroll = useCallback(() => {
    checkScrollStatus();
  }, []);

  // 停止连续滚动
  const stopContinuousScroll = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  // 向上滚动
  const scrollUp = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        top: -120, // 每次滚动3个项目的高度
        behavior: 'smooth'
      });
    }
  };

  // 向下滚动
  const scrollDown = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        top: 120, // 每次滚动3个项目的高度
        behavior: 'smooth'
      });
    }
  };

  // 开始连续向上滚动
  const startContinuousScrollUp = () => {
    if (!canScrollUp) return;
    
    // 先执行一次滚动
    scrollUp();
    
    // 设置连续滚动
    scrollIntervalRef.current = setInterval(() => {
      if (scrollContainerRef.current) {
        const { scrollTop } = scrollContainerRef.current;
        if (scrollTop <= 0) {
          stopContinuousScroll();
          return;
        }
        scrollContainerRef.current.scrollBy({
          top: -40, // 连续滚动时使用较小的步长
          behavior: 'auto' // 连续滚动时不使用smooth，避免卡顿
        });
      }
    }, 50); // 每50ms滚动一次
  };

  // 开始连续向下滚动
  const startContinuousScrollDown = () => {
    if (!canScrollDown) return;
    
    // 先执行一次滚动
    scrollDown();
    
    // 设置连续滚动
    scrollIntervalRef.current = setInterval(() => {
      if (scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        if (scrollTop >= scrollHeight - clientHeight - 1) {
          stopContinuousScroll();
          return;
        }
        scrollContainerRef.current.scrollBy({
          top: 40, // 连续滚动时使用较小的步长
          behavior: 'auto' // 连续滚动时不使用smooth，避免卡顿
        });
      }
    }, 50); // 每50ms滚动一次
  };

  // 滚动按钮样式配置
  const scrollButtonConfig = {
    baseStyles: {
      height: '150px',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      transition: 'all 0.3s ease'
    },
    enabled: {
      background: 'rgba(255, 255, 255, 0.9)',
      border: '1px solid rgba(51, 65, 85, 0.4)',
      boxShadow: '0 4px 16px rgba(51, 65, 85, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
      hoverBg: 'rgba(255, 255, 255, 0.95)',
      hoverBorder: 'rgba(51, 65, 85, 0.5)',
      hoverShadow: '0 6px 20px rgba(51, 65, 85, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.7)'
    },
    disabled: {
      background: 'rgba(248, 250, 252, 0.6)',
      border: '1px solid rgba(148, 163, 184, 0.3)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
    }
  };

  // 获取滚动按钮样式
  const getScrollButtonStyles = (isEnabled: boolean) => ({
    ...scrollButtonConfig.baseStyles,
    ...(isEnabled ? scrollButtonConfig.enabled : scrollButtonConfig.disabled)
  });

  // 处理按钮悬停效果
  const handleButtonHover = (e: React.MouseEvent<HTMLButtonElement>, isEnabled: boolean, isEnter: boolean) => {
    if (!isEnabled) return;
    
    if (isEnter) {
      // 悬停状态
      e.currentTarget.style.background = scrollButtonConfig.enabled.hoverBg;
      e.currentTarget.style.border = `1px solid ${scrollButtonConfig.enabled.hoverBorder}`;
      e.currentTarget.style.boxShadow = scrollButtonConfig.enabled.hoverShadow;
    } else {
      // 正常状态
      const styles = getScrollButtonStyles(isEnabled);
      e.currentTarget.style.background = styles.background as string;
      e.currentTarget.style.border = styles.border as string;
      e.currentTarget.style.boxShadow = styles.boxShadow as string;
    }
  };

  // 监听滚动状态变化
  useEffect(() => {
    if (isOpen && scrollContainerRef.current) {
      checkScrollStatus();
      const scrollContainer = scrollContainerRef.current;
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
      };
    }
  }, [isOpen, handleScroll]);

  // 防止菜单滚动时触发主窗口滚动
  useEffect(() => {
    if (isOpen) {
      // 锁定主窗口滚动
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;
      
      // 防止触摸滚动（只阻止菜单外部的滚动）
      const handleTouchMove = (e: TouchEvent) => {
        // 如果触摸事件发生在菜单内部，允许滚动
        if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
          return;
        }
        e.preventDefault();
      };
      
      // 防止鼠标滚轮滚动（只阻止菜单外部的滚动）
      const handleWheel = (e: WheelEvent) => {
        // 如果滚轮事件发生在菜单内部，允许滚动
        if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
          return;
        }
        e.preventDefault();
      };
      
      // 防止键盘滚动
      const handleKeyDown = (e: KeyboardEvent) => {
        if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) {
          e.preventDefault();
        }
      };

      // 添加事件监听器，使用 passive: false 确保可以阻止默认行为
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('wheel', handleWheel, { passive: false });
      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        // 恢复滚动位置和样式
        const scrollY = document.body.style.top;
        document.body.style.overflow = 'unset';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
        
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('wheel', handleWheel);
        document.removeEventListener('keydown', handleKeyDown);
        stopContinuousScroll();
      };
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative w-full flex items-center justify-between px-4 py-2 bg-transparent border-none outline-none cursor-pointer text-base sm:text-lg font-semibold text-primary hover:text-primary/80 focus:text-primary min-w-0 max-w-full transition-colors duration-200 text-center"
      >
        <span className="truncate">
          {currentSection ? (currentSection.title || currentSection.name) : '选择PDF章节'}
        </span>
        <ChevronDown className={`h-5 w-5 text-primary transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Wheel Selector - Adaptive width and height */}
      {isOpen && (
        <div 
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-[9999] rounded-xl shadow-2xl"
          style={{ 
            width: 'calc(100vw - 2rem)', // 手机端自适应屏幕宽度，左右各留1rem边距
            maxWidth: '400px', // 桌面端最大宽度限制
            height: 'min(80vh, 1000px)', // 自适应窗口高度，最大1000px
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
          }}
        >
          <div className="flex h-full">
            {/* 滚动容器 */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto scrollbar-hide"
              style={{ 
                scrollbarWidth: 'none', 
                msOverflowStyle: 'none'
              }}
              onWheel={(e) => {
                // 防止滚轮事件冒泡到主窗口
                e.stopPropagation();
              }}
            >
              {/* 选项列表 */}
              {PDF_CONFIG.sections.map((section, index) => {
                const isSelected = index === currentIndex;
                
                return (
                  <div
                    key={section.name}
                    className={`group flex items-center h-10 cursor-pointer transition-all duration-200 px-4 rounded-lg mx-2 ${
                      isSelected 
                        ? 'bg-slate-100/90' 
                        : 'hover:bg-slate-100/80 hover:shadow-md hover:scale-[1.02]'
                    }`}
                    style={{
                      backdropFilter: isSelected ? 'blur(8px)' : 'none',
                      WebkitBackdropFilter: isSelected ? 'blur(8px)' : 'none',
                      border: isSelected ? '1px solid rgba(51, 65, 85, 0.4)' : 'none',
                      boxShadow: isSelected ? '0 2px 8px rgba(51, 65, 85, 0.15)' : 'none'
                    }}
                    onClick={() => {
                      setCurrentIndex(index);
                      onSelectPDF(section.filePath, section.name);
                      setIsOpen(false);
                    }}
                  >
                    <span className={`text-sm sm:text-base font-medium text-left transition-colors duration-200 ${
                      isSelected 
                        ? 'text-slate-800 font-semibold' 
                        : 'text-slate-700 group-hover:text-slate-900'
                    }`}>
                      {section.title || section.name}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 滚动按钮区域 - 只在桌面端显示 */}
            <div 
              className="hidden sm:flex flex-col justify-center items-center w-16 border-l border-slate-300/40"
              style={{
                background: 'rgba(248, 250, 252, 0.7)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                boxShadow: 'inset 1px 0 0 rgba(255, 255, 255, 0.4)'
              }}
            >
              {/* 向上滚动按钮 */}
              <button
                onClick={scrollUp}
                onMouseDown={startContinuousScrollUp}
                onMouseUp={stopContinuousScroll}
                disabled={!canScrollUp}
                className={`group relative w-12 flex items-center justify-center rounded-xl transition-all duration-300 mb-4 ${
                  canScrollUp
                    ? 'text-slate-700 hover:text-slate-800 hover:scale-105 active:scale-95'
                    : 'text-slate-400 cursor-not-allowed'
                }`}
                style={getScrollButtonStyles(canScrollUp)}
                onMouseEnter={(e) => handleButtonHover(e, canScrollUp, true)}
                onMouseLeave={(e) => {
                  stopContinuousScroll();
                  handleButtonHover(e, canScrollUp, false);
                }}
                title="向上滚动（按住连续滚动）"
              >
                <ChevronUp className={`w-6 h-6 transition-all duration-200 ${
                  canScrollUp ? 'group-hover:scale-105' : ''
                }`} />
                {canScrollUp && (
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-slate-500/8 to-slate-600/8 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                )}
              </button>

              {/* 向下滚动按钮 */}
              <button
                onClick={scrollDown}
                onMouseDown={startContinuousScrollDown}
                onMouseUp={stopContinuousScroll}
                disabled={!canScrollDown}
                className={`group relative w-12 flex items-center justify-center rounded-xl transition-all duration-300 ${
                  canScrollDown
                    ? 'text-slate-700 hover:text-slate-800 hover:scale-105 active:scale-95'
                    : 'text-slate-400 cursor-not-allowed'
                }`}
                style={getScrollButtonStyles(canScrollDown)}
                onMouseEnter={(e) => handleButtonHover(e, canScrollDown, true)}
                onMouseLeave={(e) => {
                  stopContinuousScroll();
                  handleButtonHover(e, canScrollDown, false);
                }}
                title="向下滚动（按住连续滚动）"
              >
                <ChevronDown className={`w-6 h-6 transition-all duration-200 ${
                  canScrollDown ? 'group-hover:scale-105' : ''
                }`} />
                {canScrollDown && (
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-slate-500/8 to-slate-600/8 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}