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

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 只在没有输入框聚焦时响应快捷键
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        if (currentPage > 1) {
          pdfViewerRef.current?.jumpToPage(currentPage - 1);
        }
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        if (currentPage < totalPages) {
          pdfViewerRef.current?.jumpToPage(currentPage + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);

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
            {/* PDF Viewer Header - Google Style */}
            <div className="px-6 py-4 border-b border-gray-100 bg-white">
                <div className="flex items-center">
                  {/* Chapter Selector - Google Style */}
                  <div className="flex items-center">
                    <div className="relative">
                      <select
                        value={selectedPDF || ''}
                        onChange={(e) => {
                          const section = PDF_CONFIG.sections.find(s => s.filePath === e.target.value);
                          if (section) {
                            handleSelectPDF(section.filePath, section.name, true, false);
                          }
                        }}
                        className="appearance-none bg-transparent border-none outline-none cursor-pointer text-base font-medium text-gray-800 hover:text-gray-900 focus:text-gray-900 min-w-0 max-w-full pr-8 py-2 transition-colors duration-200"
                      >
                        {PDF_CONFIG.sections.map((section) => (
                          <option key={section.name} value={section.filePath}>
                            {section.title || section.name}
                          </option>
                        ))}
                      </select>
                      {/* Custom dropdown arrow */}
                      <div className="absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
            {/* PDF Content Area */}
            <div className="p-1 flex justify-center relative bg-white">
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
                <>
                  <PDFViewer
                    ref={pdfViewerRef}
                    pdfUrl={selectedPDF}
                    initialPage={targetPage || 1}
                    onTextExtracted={handleTextExtracted}
                    onPageChange={handlePageChange}
                  />
                  
                  {/* 悬浮翻页按钮 - Google Material Design风格 */}
                  <div className="fixed right-6 top-1/2 transform -translate-y-1/2 flex flex-col items-center space-y-4 z-50 animate-fade-in">
                    {/* 上一页按钮 */}
                    <button
                      onClick={() => pdfViewerRef.current?.jumpToPage(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="group w-12 h-12 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl shadow-lg hover:shadow-xl flex items-center justify-center text-gray-700 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 ease-out hover:scale-105 active:scale-95"
                      title="上一页 (↑ 或 ←)"
                    >
                      <svg className="w-4 h-4 transition-transform duration-200 group-hover:-translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    
                    {/* 页码显示 - 更显眼的样式 */}
                    <div className="w-14 h-8 bg-blue-600 hover:bg-blue-700 border-0 rounded-xl shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 cursor-pointer group" onClick={() => {
                      const page = prompt(`跳转到页面 (${startPage}-${startPage + totalPages - 1}):`, (startPage + currentPage - 1).toString());
                      if (page && !isNaN(Number(page))) {
                        const targetPage = Number(page);
                        if (targetPage >= startPage && targetPage <= startPage + totalPages - 1) {
                          pdfViewerRef.current?.jumpToPage(targetPage - startPage + 1);
                        }
                      }
                    }}>
                      <span className="text-xs font-bold text-white tracking-wide group-hover:scale-105 transition-transform duration-200">
                        {startPage + currentPage - 1}
                      </span>
                    </div>
                    
                    {/* 下一页按钮 */}
                    <button
                      onClick={() => pdfViewerRef.current?.jumpToPage(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                      className="group w-12 h-12 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl shadow-lg hover:shadow-xl flex items-center justify-center text-gray-700 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 ease-out hover:scale-105 active:scale-95"
                      title="下一页 (↓ 或 →)"
                    >
                      <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* 添加一个小的提示文字 */}
                    <div className="text-xs text-gray-500 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                      点击页码跳转<br/>↑↓ 或 ←→ 翻页
                    </div>
                  </div>
                </>
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
