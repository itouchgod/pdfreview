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
    <div className="relative">
      {/* Selector Button - Title Style */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-lg font-semibold text-gray-900 hover:text-blue-600 focus:outline-none transition-colors"
      >
        <FileText className="h-5 w-5" />
        <span>{currentSection ? (currentSection.title || currentSection.name) : 'Select PDF Section'}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Options */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto min-w-64">
          {PDF_CONFIG.sections.map((section) => {
            const isSelected = selectedPDF === section.filePath;
            
            return (
              <button
                key={section.name}
                onClick={() => {
                  onSelectPDF(section.filePath, section.name);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center space-x-2 p-3 text-left hover:bg-gray-50 transition-colors ${
                  isSelected ? 'bg-blue-50 text-blue-600' : 'text-gray-900'
                }`}
              >
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium text-sm">
                  {section.title || section.name}
                </span>
                {isSelected && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-auto"></div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
