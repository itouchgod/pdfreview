'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PDFViewer, { PDFViewerRef } from '@/components/PDFViewer';
import SmartSearchBox from '@/components/SmartSearchBox';
import SearchResultsOnly from '@/components/SearchResultsOnly';
import { BookOpen } from 'lucide-react';
import { PDF_CONFIG } from '@/config/pdf';
import Link from 'next/link';
import Image from 'next/image';
import { usePDFText } from '@/contexts/PDFTextContext';

function SearchContent() {
  const searchParams = useSearchParams();
  const [selectedPDF, setSelectedPDF] = useState<string>(PDF_CONFIG.sections[0].filePath);
  const [selectedSectionName, setSelectedSectionName] = useState<string>(PDF_CONFIG.sections[0].name);
  // const [isSearchCollapsed, setIsSearchCollapsed] = useState(false);
  const pdfViewerRef = useRef<PDFViewerRef>(null);
  
  // 用于在header和sidebar之间共享搜索结果
  const [sharedSearchResults, setSharedSearchResults] = useState<any[]>([]);
  const [sharedSearchTerm, setSharedSearchTerm] = useState('');
  const [sharedSearchMode, setSharedSearchMode] = useState<'current' | 'global'>('global');
  const [hasSearchResults, setHasSearchResults] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [targetPage, setTargetPage] = useState<number | undefined>(undefined);
  
  // 使用全局PDF文本数据
  const { textData } = usePDFText();
  const [currentPage, setCurrentPage] = useState(1); // 初始化为1，显示第1页
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
    // 这个函数现在不需要做任何事情，因为SmartSearchBox会直接调用onSearchResultsUpdate
    console.log('handleSearchResults called with:', results.length, 'results');
  };

  const handleClearSearch = () => {
    // 清除搜索状态
    setSharedSearchResults([]);
    setSharedSearchTerm('');
    setIsSearchActive(false);
    setHasSearchResults(false);
  };

  const handleSelectPDF = (pdfPath: string, sectionName: string, resetToFirstPage: boolean = true, clearSearch: boolean = false) => {
    console.log('handleSelectPDF called:', { pdfPath, sectionName, resetToFirstPage, clearSearch });
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
      setTargetPage(1); // 同时重置targetPage
    }
    
    // 只有在明确要求时才清空搜索状态
    if (clearSearch) {
      setIsSearchActive(false);
      setSharedSearchResults([]);
      setSharedSearchTerm('');
      setHasSearchResults(false);
    }
  };

  const handlePageJump = (pageNumber: number) => {
    console.log('handlePageJump called:', { 
      pageNumber, 
      hasPdfViewerRef: !!pdfViewerRef.current,
      currentPage,
      totalPages,
      selectedPDF
    });
    if (pdfViewerRef.current) {
      // 同时更新本地状态和PDF组件
      setCurrentPage(pageNumber);
      console.log('Calling pdfViewerRef.current.jumpToPage with:', pageNumber);
      pdfViewerRef.current.jumpToPage(pageNumber);
    } else {
      console.log('PDF viewer ref is null, cannot jump to page');
    }
  };

  const handleSectionChange = (sectionPath: string, resetToFirstPage: boolean = true) => {
    const section = PDF_CONFIG.sections.find(s => s.filePath === sectionPath);
    if (section) {
      handleSelectPDF(section.filePath, section.name, resetToFirstPage, false);
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

  // const handleToggleSearchCollapse = () => {
  //   setIsSearchCollapsed(!isSearchCollapsed);
  // };

  const handleSearchResultsUpdate = (results: any[], searchTerm: string, searchMode: 'current' | 'global') => {
    console.log('handleSearchResultsUpdate called:', { 
      resultsCount: results.length, 
      searchTerm, 
      searchMode
    });
    setSharedSearchResults(results);
    setSharedSearchTerm(searchTerm);
    setSharedSearchMode(searchMode);
    setHasSearchResults(results.length > 0);
    setIsSearchActive(true); // 标记搜索已激活
    
    // 如果有搜索结果，设置目标页面为第一个结果的页面
    if (results.length > 0) {
      const firstResult = results[0];
      const section = PDF_CONFIG.sections.find(s => s.filePath === firstResult.sectionPath);
      if (section) {
        const relativePage = firstResult.page - section.startPage + 1;
        // 只在目标页面真正变化时才更新
        if (targetPage !== relativePage) {
          console.log('Setting target page:', relativePage);
          setTargetPage(relativePage);
          // 同时更新当前页面状态
          setCurrentPage(relativePage);
        }
      }
    } else {
      // 只在目标页面不为undefined时才更新
      if (targetPage !== undefined) {
        setTargetPage(undefined);
      }
    }
    
    // 如果需要切换章节，直接切换（PDFViewer会使用initialPage显示正确页面）
    if (results.length > 0) {
      const firstResult = results[0];
      if (firstResult.sectionPath !== selectedPDF) {
        const section = PDF_CONFIG.sections.find(s => s.filePath === firstResult.sectionPath);
        if (section) {
          console.log('Switching section for search result:', firstResult.sectionPath);
          handleSelectPDF(section.filePath, section.name, false, false);
        }
      }
    }
  };

  // 从URL参数获取搜索词
  const searchQuery = searchParams.get('q') || '';

  // 当URL中的搜索词变化时，自动执行搜索
  useEffect(() => {
    if (searchQuery && textData && Object.keys(textData).length > 0) {
      console.log('Auto search from URL:', { searchQuery, textDataCount: Object.keys(textData).length });
      // 数据已加载完成，直接执行搜索
      const searchResults = searchInAllSections(searchQuery, textData);
      console.log('Auto search results:', { count: searchResults.length });
      handleSearchResultsUpdate(searchResults, searchQuery, 'global');
    }
  }, [searchQuery, textData, searchParams]);

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
  }, [searchParams]); // 包含searchParams依赖

  return (
    <div className="min-h-screen bg-white">
      {/* 头部 - Google风格，响应式布局 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-full mx-auto px-4 py-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Logo - 保留点击返回功能，移除返回箭头 */}
            <Link href="/home" className="flex items-center hover:opacity-80 transition-opacity duration-200 flex-shrink-0">
                <Image 
                  src="/brand-icon.svg" 
                  alt="IMPA Logo" 
                  width={20}
                  height={28}
                  className="sm:w-5 sm:h-7"
                />
            </Link>
            
            {/* 搜索框 - 紧跟在logo后面 */}
            <div className="w-full max-w-2xl">
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
          </div>
        </div>
      </header>

      {/* 主要内容 - 响应式布局 */}
      <main className="max-w-full mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* PDF查看器 - 在移动端占满宽度，桌面端占左侧 */}
          <div className="flex-1 min-w-0 order-1 lg:order-1">
            {/* PDF Viewer Header with Navigation - Google Style */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  {/* Left: Chapter Selector */}
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                    <select
                      value={selectedPDF || ''}
                      onChange={(e) => {
                        const section = PDF_CONFIG.sections.find(s => s.filePath === e.target.value);
                        if (section) {
                          handleSelectPDF(section.filePath, section.name, true, false);
                        }
                      }}
                      className="text-sm text-gray-700 bg-transparent border-none outline-none cursor-pointer hover:text-gray-900 focus:text-gray-900 min-w-0 max-w-full truncate font-medium"
                    >
                      {PDF_CONFIG.sections.map((section) => (
                        <option key={section.name} value={section.filePath}>
                          {section.title || section.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Center: Page Navigation - 在移动端简化 */}
                  <div className="flex items-center space-x-2 sm:space-x-4">
                    <button
                      onClick={() => pdfViewerRef.current?.jumpToPage(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    
                    <div className="flex items-center space-x-1 sm:space-x-2">
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
                        className="w-12 sm:w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="text-sm text-gray-500 hidden sm:inline">of {startPage + totalPages - 1}</span>
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
                </div>
              </div>
              
            {/* PDF Content Area */}
            <div className="p-1 flex justify-center">
              {isSearchActive && sharedSearchTerm && !hasSearchResults ? (
                // 当搜索激活且有搜索词但没有结果时，显示无结果提示
                <div className="flex flex-col items-center justify-center h-96">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <p className="text-base text-gray-600 font-medium mb-1">No results found</p>
                    <p className="text-sm text-gray-500">Try different keywords</p>
                  </div>
                </div>
              ) : (
                // 正常显示PDF
                <PDFViewer
                  ref={pdfViewerRef}
                  pdfUrl={selectedPDF}
                  initialPage={targetPage || 1}
                  onTextExtracted={handleTextExtracted}
                  onPageChange={handlePageChange}
                />
              )}
            </div>
          </div>

          {/* 搜索结果 - 在移动端显示在PDF下方，桌面端显示在右侧 */}
          <div className="w-full lg:w-80 xl:w-96 lg:flex-shrink-0 h-96 lg:h-screen overflow-hidden order-2 lg:order-2">
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-3">
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
      <footer className="mt-auto py-6 text-center text-sm text-gray-500 border-t border-gray-200">
        <div className="max-w-full mx-auto px-4">
          <div className="flex justify-center items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Image 
                src="/brand-icon.svg" 
                alt="IMPA Logo" 
                width={16}
                height={20}
              />
              <span>Marine Stores Guide</span>
            </div>
            <span>•</span>
            <span>8th Edition 2023</span>
            <span>•</span>
            <span>Internal Use Only</span>
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
