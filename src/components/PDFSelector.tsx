'use client';

import { useState, useRef, useEffect } from 'react';
import { FileText, ChevronDown, Check } from 'lucide-react';
import { PDF_CONFIG } from '@/config/pdf';

interface PDFSelectorProps {
  onSelectPDF: (pdfPath: string, sectionName: string) => void;
  selectedPDF?: string;
}

export default function PDFSelector({ onSelectPDF, selectedPDF }: PDFSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Get currently selected section
  const currentSection = PDF_CONFIG.sections.find(s => s.filePath === selectedPDF);

  // Close dropdown when clicking outside
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

  // Group sections by category for better organization
  const groupedSections = PDF_CONFIG.sections.reduce((acc, section) => {
    const category = section.category || '其他';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(section);
    return acc;
  }, {} as Record<string, typeof PDF_CONFIG.sections>);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selector Button - Enhanced Style with Mobile Optimization */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center space-x-3 px-3 sm:px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 min-w-0 touch-manipulation active:scale-95"
      >
        <div className="flex-shrink-0 p-1.5 sm:p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
          <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-sm font-medium text-gray-900 truncate">
            {currentSection ? (currentSection.title || currentSection.name) : '选择PDF章节'}
          </div>
          {currentSection && (
            <div className="text-xs text-gray-500 truncate">
              <span className="hidden sm:inline">{currentSection.description} • </span>
              {currentSection.size}
            </div>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Options - Enhanced Design with Mobile Optimization */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-3 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto w-full sm:min-w-80 sm:max-w-md">
          <div className="p-2">
            {Object.entries(groupedSections).map(([category, sections]) => (
              <div key={category} className="mb-4 last:mb-0">
                {/* Category Header */}
                <div className="px-3 py-2 mb-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {category}
                  </h3>
                </div>
                
                {/* Section Items */}
                <div className="space-y-1">
                  {sections.map((section) => {
                    const isSelected = selectedPDF === section.filePath;
                    
                    return (
                      <button
                        key={section.name}
                        onClick={() => {
                          onSelectPDF(section.filePath, section.name);
                          setIsOpen(false);
                        }}
                        className={`w-full flex items-start space-x-3 p-3 text-left rounded-lg transition-all duration-150 touch-manipulation ${
                          isSelected 
                            ? 'bg-blue-50 border border-blue-200 text-blue-900' 
                            : 'hover:bg-gray-50 text-gray-900 hover:border-gray-200 border border-transparent active:bg-gray-100'
                        }`}
                      >
                        <div className={`flex-shrink-0 p-1.5 rounded-md transition-colors ${
                          isSelected ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <FileText className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium text-sm leading-tight ${
                            isSelected ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {section.title || section.name}
                          </div>
                          <div className={`text-xs mt-1 leading-tight ${
                            isSelected ? 'text-blue-600' : 'text-gray-500'
                          }`}>
                            {section.description}
                          </div>
                          <div className={`text-xs mt-1 ${
                            isSelected ? 'text-blue-500' : 'text-gray-400'
                          }`}>
                            <span className="hidden sm:inline">{section.size} • </span>
                            第 {section.startPage}-{section.endPage} 页
                          </div>
                        </div>
                        {isSelected && (
                          <div className="flex-shrink-0 p-1">
                            <Check className="h-4 w-4 text-blue-600" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
