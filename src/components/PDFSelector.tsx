'use client';

import { useState } from 'react';
import { FileText, ChevronDown } from 'lucide-react';
import { PDF_CONFIG } from '@/config/pdf';

interface PDFSelectorProps {
  onSelectPDF: (pdfPath: string, sectionName: string) => void;
  selectedPDF?: string;
}

export default function PDFSelector({ onSelectPDF, selectedPDF }: PDFSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Get currently selected section
  const currentSection = PDF_CONFIG.sections.find(s => s.filePath === selectedPDF);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="relative">
        {/* Selector Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        >
          <div className="flex items-center space-x-3">
            <FileText className="h-5 w-5 text-gray-600" />
            <div className="text-left">
              <div className="font-medium text-gray-900">
                {currentSection ? (currentSection.title || currentSection.name) : 'Select PDF Section'}
              </div>
              {currentSection && (
                <div className="text-sm text-gray-500">
                  {currentSection.category} • {currentSection.endPage - currentSection.startPage + 1} pages
                </div>
              )}
            </div>
          </div>
          <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Options */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
            {PDF_CONFIG.sections.map((section) => {
              const isSelected = selectedPDF === section.filePath;
              
              return (
                <button
                  key={section.name}
                  onClick={() => {
                    onSelectPDF(section.filePath, section.name);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <FileText className="h-4 w-4 text-gray-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm">
                      {section.title || section.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {section.category} • {section.endPage - section.startPage + 1} pages • {section.size}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
