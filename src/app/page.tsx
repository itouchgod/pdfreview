'use client';

import { useState, useRef } from 'react';
import PDFViewer, { PDFViewerRef } from '@/components/PDFViewer';
import SmartSearchBox from '@/components/SmartSearchBox';
import PDFSelector from '@/components/PDFSelector';
import { FileText, Search, BookOpen, Globe } from 'lucide-react';
import { PDF_CONFIG } from '@/config/pdf';

export default function Home() {
  const [extractedText, setExtractedText] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedPDF, setSelectedPDF] = useState<string>(PDF_CONFIG.sections[0].filePath);
  const [selectedSectionName, setSelectedSectionName] = useState<string>(PDF_CONFIG.sections[0].name);
  const [highlightText, setHighlightText] = useState<string>('');
  const pdfViewerRef = useRef<PDFViewerRef>(null);

  const handleTextExtracted = (text: string) => {
    setExtractedText(text);
  };

  const handleSearchResults = (results: any[]) => {
    setSearchResults(results);
    setShowSearchResults(results.length > 0);
  };

  const handleClearSearch = () => {
    setShowSearchResults(false);
    setHighlightText('');
  };

  const handleHighlightText = (text: string) => {
    setHighlightText(text);
  };

  const handleSelectPDF = (pdfPath: string, sectionName: string) => {
    setSelectedPDF(pdfPath);
    setSelectedSectionName(sectionName);
    // 清空之前的搜索结果
    setExtractedText('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const handlePageJump = (pageNumber: number) => {
    if (pdfViewerRef.current) {
      pdfViewerRef.current.jumpToPage(pageNumber);
    }
  };

  const handleSectionChange = (sectionPath: string) => {
    const section = PDF_CONFIG.sections.find(s => s.filePath === sectionPath);
    if (section) {
      handleSelectPDF(section.filePath, section.title);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-xl">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  IMPA Marine Stores Guide
                </h1>
                <p className="text-sm text-gray-500">
                  8th Edition 2023 - Smart Search Platform
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="hidden md:flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Online</span>
                </div>
                <div className="flex items-center space-x-1">
                  <FileText className="h-4 w-4" />
                  <span>{PDF_CONFIG.sections.length} Sections</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 顶部工具栏 */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* PDF选择器 */}
            <div className="flex-1 max-w-md">
              <PDFSelector
                onSelectPDF={handleSelectPDF}
                selectedPDF={selectedPDF}
              />
            </div>
            
            {/* Current Section Info */}
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Current Section:</span>
                <span className="font-medium text-gray-900">{selectedSectionName}</span>
              </div>
              <div className="hidden md:flex items-center space-x-4 text-xs text-gray-500">
                <span>Pages: {PDF_CONFIG.sections.find(s => s.filePath === selectedPDF)?.endPage - PDF_CONFIG.sections.find(s => s.filePath === selectedPDF)?.startPage + 1 || 0}</span>
                <span>Category: {PDF_CONFIG.sections.find(s => s.filePath === selectedPDF)?.category || 'Other'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left: Search Area */}
          <div className="xl:col-span-1">
            <div className="sticky top-6 space-y-4">
              {/* Search Area */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center space-x-2">
                    <Search className="h-5 w-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Smart Search</h2>
                  </div>
                </div>
                
                <div className="p-6">
                <SmartSearchBox
                  onSearchResults={handleSearchResults}
                  onClearSearch={handleClearSearch}
                  onPageJump={handlePageJump}
                  onSectionChange={handleSectionChange}
                  onHighlightText={handleHighlightText}
                  currentSection={selectedSectionName}
                />
                </div>
              </div>

              {/* Usage Guide */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <BookOpen className="h-4 w-4 mr-2 text-gray-600" />
                  Usage Guide
                </h3>
                <ul className="text-xs text-gray-600 space-y-2">
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                    Click quick search keywords to search directly
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                    Supports current section and global search modes
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                    Click search results to automatically jump to the corresponding page
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                    Use Ctrl+Enter for quick search
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right: PDF Viewer */}
          <div className="xl:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* PDF Viewer Header */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {selectedSectionName}
                      </h2>
                      <p className="text-sm text-gray-500">
                        IMPA Marine Stores Guide - 8th Edition 2023
                      </p>
                    </div>
                  </div>
                  
                  {/* Section Statistics */}
                  <div className="hidden lg:flex items-center space-x-6 text-sm text-gray-600">
                    <div className="text-center">
                      <div className="font-semibold text-gray-900">
                        {PDF_CONFIG.sections.find(s => s.filePath === selectedPDF)?.startPage || 0}
                      </div>
                      <div className="text-xs">Start Page</div>
                    </div>
                    <div className="text-gray-300">|</div>
                    <div className="text-center">
                      <div className="font-semibold text-gray-900">
                        {PDF_CONFIG.sections.find(s => s.filePath === selectedPDF)?.endPage || 0}
                      </div>
                      <div className="text-xs">End Page</div>
                    </div>
                    <div className="text-gray-300">|</div>
                    <div className="text-center">
                      <div className="font-semibold text-gray-900">
                        {PDF_CONFIG.sections.find(s => s.filePath === selectedPDF)?.size || '0MB'}
                      </div>
                      <div className="text-xs">File Size</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* PDF Content Area */}
              <div className="p-6">
                <PDFViewer
                  ref={pdfViewerRef}
                  pdfUrl={selectedPDF}
                  onTextExtracted={handleTextExtracted}
                  highlightText={highlightText}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-lg">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">IMPA Marine Stores Guide</p>
                <p className="text-xs text-gray-500">8th Edition 2023 - Smart Search Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-6 text-xs text-gray-500">
              <span>Built with Next.js and PDF.js</span>
              <span>•</span>
              <span>© 2024 IMPA Search Platform</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}