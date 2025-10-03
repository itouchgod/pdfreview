'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, FileText } from 'lucide-react';

interface PDFSelectorProps {
  selectedPDF: string;
  onSelectPDF: (pdfPath: string) => void;
}

export default function PDFSelector({ selectedPDF, onSelectPDF }: PDFSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 获取当前选中的文档名称
  const currentDocumentName = selectedPDF ? selectedPDF.split('/').pop() || 'Unknown' : 'No document selected';
  
  // 获取当前选中项的索引
  useEffect(() => {
    // 通用PDF平台：简化处理
    setCurrentIndex(0);
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

  // 键盘导航
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        break;
      case 'ArrowDown':
        event.preventDefault();
        // 通用PDF平台：简化处理
        break;
      case 'ArrowUp':
        event.preventDefault();
        // 通用PDF平台：简化处理
        break;
      case 'Enter':
        event.preventDefault();
        // 通用PDF平台：简化处理
        break;
    }
  };

  const handleSelect = (pdfPath: string) => {
    onSelectPDF(pdfPath);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 选择器按钮 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="flex items-center justify-between w-full max-w-md px-4 py-3 bg-card border border-border rounded-lg hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select PDF document"
      >
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className="flex-shrink-0 w-5 h-5 text-muted-foreground">
            <FileText className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-foreground truncate">
            {currentDocumentName}
          </span>
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          <div className="py-1">
            {selectedPDF ? (
              <div
                className="flex items-center space-x-3 px-4 py-3 hover:bg-accent cursor-pointer transition-colors"
                onClick={() => handleSelect(selectedPDF)}
              >
                <div className="flex-shrink-0 w-5 h-5 text-primary">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground truncate">
                    {currentDocumentName}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    Current document
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                No documents available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}