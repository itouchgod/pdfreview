'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PDFViewer, { PDFViewerRef } from '@/components/PDFViewer';
import SmartSearchBox from '@/components/SmartSearchBox';
import SearchResultsOnly from '@/components/SearchResultsOnly';
import { FileText, Search, BookOpen, ChevronUp, ChevronDown, ArrowLeft } from 'lucide-react';
import { PDF_CONFIG } from '@/config/pdf';
import Link from 'next/link';
import { usePDFText } from '@/contexts/PDFTextContext';

function SearchContent() {
  const searchParams = useSearchParams();
  const [, setSearchResults] = useState<unknown[]>([]);
  const [, setShowSearchResults] = useState(false);
  const [selectedPDF, setSelectedPDF] = useState<string>(PDF_CONFIG.sections[0].filePath);
  const [selectedSectionName, setSelectedSectionName] = useState<string>(PDF_CONFIG.sections[0].name);
  const [isSearchCollapsed, setIsSearchCollapsed] = useState(false);
  const pdfViewerRef = useRef<PDFViewerRef>(null);
  
  // 用于在header和sidebar之间共享搜索结果
  const [sharedSearchResults, setSharedSearchResults] = useState<any[]>([]);
  const [sharedSearchTerm, setSharedSearchTerm] = useState('');
  const [sharedSearchMode, setSharedSearchMode] = useState<'current' | 'global'>('global');
  
  // 使用全局PDF文本数据
  const { textData, isReady } = usePDFText();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(() => {
    const section = PDF_CONFIG.sections.find(s => s.filePath === PDF_CONFIG.sections[0].filePath);
    return section ? (section.endPage - section.startPage + 1) : 1;
  });
  const [startPage, setStartPage] = useState(() => {
    const section = PDF_CONFIG.sections.find(s => s.filePath === PDF_CONFIG.sections[0].filePath);
    return section ? section.startPage : 1;
  });

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

  const handleSelectPDF = (pdfPath: string, sectionName: string, resetToFirstPage: boolean = true) => {
    console.log('handleSelectPDF called:', { pdfPath, sectionName, resetToFirstPage });
    setSelectedPDF(pdfPath);
    setSelectedSectionName(sectionName);
    // 更新总页数和起始页
    const section = PDF_CONFIG.sections.find(s => s.filePath === pdfPath);
    if (section) {
      setTotalPages(section.endPage - section.startPage + 1);
      setStartPage(section.startPage);
    }
    // 只有在明确要求时才重置当前页为第一页
    if (resetToFirstPage) {
      setCurrentPage(1);
    }
    // 不清空搜索结果，保持搜索结果状态
    setShowSearchResults(false);
  };

  const handlePageJump = (pageNumber: number) => {
    console.log('handlePageJump called:', { pageNumber, hasPdfViewerRef: !!pdfViewerRef.current });
    if (pdfViewerRef.current) {
      pdfViewerRef.current.jumpToPage(pageNumber);
    }
  };

  const handleSectionChange = (sectionPath: string, resetToFirstPage: boolean = true) => {
    const section = PDF_CONFIG.sections.find(s => s.filePath === sectionPath);
    if (section) {
      handleSelectPDF(section.filePath, section.name, resetToFirstPage);
    }
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

  const handleToggleSearchCollapse = () => {
    setIsSearchCollapsed(!isSearchCollapsed);
  };

  const handleSearchResultsUpdate = (results: any[], searchTerm: string, searchMode: 'current' | 'global') => {
    console.log('handleSearchResultsUpdate called:', { resultsCount: results.length, searchTerm, searchMode });
    setSharedSearchResults(results);
    setSharedSearchTerm(searchTerm);
    setSharedSearchMode(searchMode);
  };

  // 从URL参数获取搜索词
  const searchQuery = searchParams.get('q') || '';

  // 当URL中的搜索词变化时，自动执行搜索
  useEffect(() => {
    if (searchQuery && textData && Object.keys(textData).length > 0) {
      console.log('Auto search from URL:', { searchQuery, textDataCount: Object.keys(textData).length });
      // 模拟搜索执行
      const searchResults = searchInAllSections(searchQuery, textData);
      console.log('Auto search results:', { count: searchResults.length });
      handleSearchResultsUpdate(searchResults, searchQuery, 'global');
    }
  }, [searchQuery, textData]);

  // 搜索函数
  const searchInAllSections = (query: string, sectionsText: Record<string, string>) => {
    const results: any[] = [];
    const searchTerm = query.toLowerCase();

    Object.entries(sectionsText).forEach(([sectionPath, text]) => {
      const lines = text.split('\n');
      let pageNumber = 1;
      
      lines.forEach((line) => {
        // 检查是否是页面分隔符
        if (line.includes('--- 第') && line.includes('页 ---')) {
          const pageMatch = line.match(/第 (\d+) 页/);
          if (pageMatch) {
            pageNumber = parseInt(pageMatch[1]);
          }
          return;
        }
        
        // 搜索匹配
        if (line.toLowerCase().includes(searchTerm)) {
          const section = PDF_CONFIG.sections.find(s => s.filePath === sectionPath);
          if (section) {
            results.push({
              page: pageNumber,
              text: line.trim(),
              index: results.length,
              context: line.trim(),
              sectionName: section.name,
              sectionPath: sectionPath,
              category: 'search'
            });
          }
        }
      });
    });
    
    return results;
  };

  // 从URL参数初始化状态 - 只在组件挂载时执行一次
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
  }, []); // 空依赖数组，只在挂载时执行一次

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 - Google风格 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* 左侧：Logo和返回链接 */}
            <div className="flex items-center space-x-4">
              <Link href="/home" className="flex items-center space-x-2 hover:bg-gray-100 p-2 rounded-lg transition-colors">
                <ArrowLeft className="h-5 w-5 text-gray-600" />
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-lg">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-medium text-gray-900">IMPA Search</span>
              </Link>
            </div>
            
            {/* 中间：搜索框 */}
            <div className="flex-1 max-w-2xl mx-8">
              <SmartSearchBox
                onSearchResults={handleSearchResults}
                onClearSearch={handleClearSearch}
                onPageJump={handlePageJump}
                onSectionChange={handleSectionChange}
                onUpdateURL={handleUpdateURL}
                currentSection={selectedSectionName}
                selectedPDF={selectedPDF}
                showSearchInHeader={true}
                initialSearchTerm={searchQuery}
                preloadedTextData={textData}
                onSearchResultsUpdate={handleSearchResultsUpdate}
              />
            </div>
            
            {/* 右侧：状态信息 */}
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              {/* 加载状态已移除，因为数据在首页已预加载 */}
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容 - 左右分栏布局 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* 左侧：PDF查看器 */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* PDF Viewer Header with Navigation - Google Style */}
              <div className="bg-white px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  {/* Left: Chapter Selector */}
                  <div className="flex items-center space-x-3">
                    <select
                      value={selectedPDF || ''}
                      onChange={(e) => {
                        const section = PDF_CONFIG.sections.find(s => s.filePath === e.target.value);
                        if (section) {
                          handleSelectPDF(section.filePath, section.name);
                        }
                      }}
                      className="text-sm text-gray-700 bg-transparent border-none outline-none cursor-pointer hover:text-gray-900 focus:text-gray-900 min-w-0 max-w-xs truncate"
                    >
                      {PDF_CONFIG.sections.map((section) => (
                        <option key={section.name} value={section.filePath}>
                          {section.title || section.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Center: Page Navigation */}
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => pdfViewerRef.current?.jumpToPage(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    
                    <div className="flex items-center space-x-2">
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
                        className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="text-sm text-gray-500">of {startPage + totalPages - 1}</span>
                    </div>
                    
                    <button
                      onClick={() => pdfViewerRef.current?.jumpToPage(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {/* Right: Empty space for balance */}
                  <div className="w-20"></div>
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
          </div>

          {/* 右侧：搜索结果 */}
          <div className="w-80 flex-shrink-0 h-screen overflow-hidden">
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-4">
                <SearchResultsOnly
                  onPageJump={handlePageJump}
                  onSectionChange={handleSectionChange}
                  currentSection={selectedSectionName}
                  selectedPDF={selectedPDF}
                  initialSearchTerm={searchQuery}
                  preloadedTextData={textData}
                  sharedSearchResults={sharedSearchResults}
                  sharedSearchTerm={sharedSearchTerm}
                  sharedSearchMode={sharedSearchMode}
                />
              </div>
            </div>
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

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}
