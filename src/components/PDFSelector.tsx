'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, FileText } from 'lucide-react';

interface UserDocument {
  id: string;
  name: string;
  originalName: string;
  size: number;
  url: string;
  uploadTime: Date;
  lastViewed?: Date;
  viewCount: number;
  category?: string;
  tags: string[];
}

interface PDFSelectorProps {
  selectedPDF: string;
  userDocuments?: UserDocument[];
  onSelectPDF: (pdfPath: string) => void;
}

export default function PDFSelector({ selectedPDF, userDocuments = [], onSelectPDF }: PDFSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 获取当前选中的文档名称
  const getCurrentDocumentName = () => {
    if (!selectedPDF) return 'No document selected';
    
    // 首先检查是否是用户文档
    const userDoc = userDocuments.find(doc => doc.url === selectedPDF);
    if (userDoc) {
      return userDoc.name;
    }
    
    // 否则使用路径中的文件名
    return selectedPDF.split('/').pop() || 'Unknown';
  };
  
  const currentDocumentName = getCurrentDocumentName();
  
  // 获取当前选中项的索引
  useEffect(() => {
    if (userDocuments.length > 0) {
      const index = userDocuments.findIndex(doc => doc.url === selectedPDF);
      setCurrentIndex(index >= 0 ? index : 0);
    } else {
      setCurrentIndex(0);
    }
  }, [selectedPDF, userDocuments]);

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
        if (userDocuments.length > 0) {
          setCurrentIndex((prev) => (prev + 1) % userDocuments.length);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (userDocuments.length > 0) {
          setCurrentIndex((prev) => (prev - 1 + userDocuments.length) % userDocuments.length);
        }
        break;
      case 'Enter':
        event.preventDefault();
        if (userDocuments.length > 0 && userDocuments[currentIndex]) {
          handleSelect(userDocuments[currentIndex].url);
        }
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
            {userDocuments.length > 0 ? (
              userDocuments.map((document, index) => (
                <div
                  key={document.id}
                  className={`flex items-center space-x-3 px-4 py-3 hover:bg-accent cursor-pointer transition-colors ${
                    index === currentIndex ? 'bg-accent' : ''
                  }`}
                  onClick={() => handleSelect(document.url)}
                >
                  <div className="flex-shrink-0 w-5 h-5 text-primary">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">
                      {document.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {document.uploadTime.toLocaleDateString()} • {Math.round(document.size / 1024)} KB
                    </div>
                  </div>
                  {document.url === selectedPDF && (
                    <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full"></div>
                  )}
                </div>
              ))
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