
'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PDFViewer, { PDFViewerRef } from '@/components/PDFViewer';
import SmartSearchBox from '@/components/SmartSearchBox';
import { FileText, Search, BookOpen } from 'lucide-react';
import { PDF_CONFIG } from '@/config/pdf';

function HomeContent() {
  const searchParams = useSearchParams();
  const [, setSearchResults] = useState<unknown[]>([]);
  const [, setShowSearchResults] = useState(false);
  const [selectedPDF, setSelectedPDF] = useState<string>(PDF_CONFIG.sections[0].filePath);
  const [selectedSectionName, setSelectedSectionName] = useState<string>(PDF_CONFIG.sections[0].name);
  const [isLoadingText, setIsLoadingText] = useState(true);
  const [loadedSections, setLoadedSections] = useState(0);
  const [totalSections, setTotalSections] = useState(PDF_CONFIG.sections.length);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(() => {
    const section = PDF_CONFIG.sections.find(s => s.filePath === PDF_CONFIG.sections[0].filePath);
    return section ? (section.endPage - section.startPage + 1) : 1;
  });
  const [startPage, setStartPage] = useState(() => {
    const section = PDF_CONFIG.sections.find(s => s.filePath === PDF_CONFIG.sections[0].filePath);
    return section ? section.startPage : 1;
  });
  // Highlight functionality removed
  const pdfViewerRef = useRef<PDFViewerRef>(null);

  const handleTextExtracted = () => {
    // Text extracted for search functionality
  };

  const handleSearchResults = (results: unknown[]) => {
    setSearchResults(results);
    setShowSearchResults(results.length > 0);
  };

  const handleClearSearch = () => {
    setShowSearchResults(false);
  };

  // Highlight functionality removed

  const handleSelectPDF = (pdfPath: string, sectionName: string) => {
    setSelectedPDF(pdfPath);
    setSelectedSectionName(sectionName);
    // 更新总页数和起始页
    const section = PDF_CONFIG.sections.find(s => s.filePath === pdfPath);
    if (section) {
      setTotalPages(section.endPage - section.startPage + 1);
      setStartPage(section.startPage);
    }
    // 重置当前页为第一页
    setCurrentPage(1);
    // 清空之前的搜索结果
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

  const handleLoadingStatusChange = (isLoading: boolean, loaded: number, total: number) => {
    setIsLoadingText(isLoading);
    setLoadedSections(loaded);
    setTotalSections(total);
  };

  const handleUpdateURL = (params: { query?: string; section?: string; page?: number }) => {
    const url = new URL(window.location.href);
    
    // 清除现有参数
    url.searchParams.delete('q');
    url.searchParams.delete('section');
    url.searchParams.delete('page');
    
    // 添加新参数
    if (params.query) {
      url.searchParams.set('q', params.query);
    }
    if (params.section) {
      url.searchParams.set('section', params.section);
    }
    if (params.page) {
      url.searchParams.set('page', params.page.toString());
    }
    
    // 更新URL（不刷新页面）
    window.history.pushState({}, '', url.toString());
  };

  const handlePageChange = (page: number, total: number) => {
    setCurrentPage(page);
    setTotalPages(total);
  };

  // 从URL参数初始化状态
  useEffect(() => {
    const section = searchParams.get('section');
    const page = searchParams.get('page');
    
    if (section) {
      const foundSection = PDF_CONFIG.sections.find(s => s.filePath === section);
      if (foundSection) {
        setSelectedPDF(foundSection.filePath);
        setSelectedSectionName(foundSection.name);
      }
    }
    
    if (page && pdfViewerRef.current) {
      const pageNum = parseInt(page);
      if (pageNum > 0) {
        // 延迟跳转，确保PDF已加载
        setTimeout(() => {
          if (pdfViewerRef.current) {
            pdfViewerRef.current.jumpToPage(pageNum);
          }
        }, 1000);
      }
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-1.5 sm:p-2 rounded-lg sm:rounded-xl">
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                  IMPA Marine Stores Guide
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">
                  8th Edition 2023 - Smart Search Platform
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-6">
              <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></div>
                  <span className="hidden sm:inline">Online</span>
                </div>
                <div className="flex items-center space-x-1">
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{PDF_CONFIG.sections.length} Sections</span>
                  <span className="sm:hidden">{PDF_CONFIG.sections.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">

        {/* Search Area - Compact */}
        <div className="mb-3 sm:mb-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Search className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                  <h2 className="text-sm sm:text-base font-semibold text-gray-900">Smart Search</h2>
                </div>
                {isLoadingText && (
                  <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-600">
                    <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-blue-600"></div>
                    <span className="hidden sm:inline">Loading text content... ({loadedSections}/{totalSections})</span>
                    <span className="sm:hidden">({loadedSections}/{totalSections})</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-3 sm:p-4">
              <SmartSearchBox
                onSearchResults={handleSearchResults}
                onClearSearch={handleClearSearch}
                onPageJump={handlePageJump}
                onSectionChange={handleSectionChange}
                onSelectPDF={handleSelectPDF}
                onLoadingStatusChange={handleLoadingStatusChange}
                onUpdateURL={handleUpdateURL}
                currentSection={selectedSectionName}
                selectedPDF={selectedPDF}
              />
            </div>
          </div>
        </div>

        {/* PDF Viewer - Full Width */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* PDF Viewer Header with Navigation */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              {/* Left: Section Info */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="bg-blue-100 p-1 sm:p-1.5 rounded-md">
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-semibold text-gray-900">
                    {selectedSectionName}
                  </h2>
                  <div className="flex items-center space-x-2 sm:space-x-3 text-xs text-gray-500">
                    <span className="hidden sm:inline">Start Page {PDF_CONFIG.sections.find(s => s.filePath === selectedPDF)?.startPage || 0}</span>
                    <span className="hidden sm:inline">End Page {PDF_CONFIG.sections.find(s => s.filePath === selectedPDF)?.endPage || 0}</span>
                    <span className="hidden sm:inline">File Size {PDF_CONFIG.sections.find(s => s.filePath === selectedPDF)?.size || '0MB'}</span>
                    <span className="sm:hidden">Pages {PDF_CONFIG.sections.find(s => s.filePath === selectedPDF)?.startPage || 0}-{PDF_CONFIG.sections.find(s => s.filePath === selectedPDF)?.endPage || 0}</span>
                  </div>
                </div>
              </div>
              
              {/* Right: Page Navigation */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                <button
                  onClick={() => pdfViewerRef.current?.jumpToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="px-2 sm:px-3 py-1 bg-blue-500 text-white rounded text-xs sm:text-sm hover:bg-blue-600 disabled:bg-gray-300"
                >
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Prev</span>
                </button>
                <span className="text-xs sm:text-sm text-gray-600 min-w-16 sm:min-w-20 text-center">
                  <span className="hidden sm:inline">Page {startPage + currentPage - 1} of {startPage + totalPages - 1}</span>
                  <span className="sm:hidden">{startPage + currentPage - 1}/{startPage + totalPages - 1}</span>
                </span>
                <button
                  onClick={() => pdfViewerRef.current?.jumpToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="px-2 sm:px-3 py-1 bg-blue-500 text-white rounded text-xs sm:text-sm hover:bg-blue-600 disabled:bg-gray-300"
                >
                  Next
                </button>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min={startPage}
                    max={startPage + totalPages - 1}
                    value={startPage + currentPage - 1}
                    onChange={(e) => {
                      const pageNum = parseInt(e.target.value);
                      if (pageNum && pdfViewerRef.current) {
                        const relativePage = pageNum - startPage + 1;
                        pdfViewerRef.current.jumpToPage(relativePage);
                      }
                    }}
                    className="w-12 sm:w-16 px-1 sm:px-2 py-1 border rounded text-center text-xs sm:text-sm"
                  />
                  <span className="text-xs text-gray-500 hidden sm:inline">Go to</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* PDF Content Area */}
          <div className="p-1 sm:p-2">
            <PDFViewer
              ref={pdfViewerRef}
              pdfUrl={selectedPDF}
              onTextExtracted={handleTextExtracted}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8 sm:mt-16">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-1.5 sm:p-2 rounded-lg">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-900">IMPA Marine Stores Guide</p>
                <p className="text-xs text-gray-500 hidden sm:block">8th Edition 2023 - Smart Search Platform</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-6 text-xs text-gray-500">
              <span>This page is for internal use only.</span>
              <span className="hidden sm:inline">•</span>
              <span>© 2025 IMPA Search Platform</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}