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
  const [currentResultIndex, setCurrentResultIndex] = useState(0); // 跟踪当前选中的结果索引
  
  // 计算搜索结果区域的动态高度
  const getSearchResultsHeight = () => {
    if (!sharedSearchResults || sharedSearchResults.length === 0) {
      return 'h-48'; // 无结果时较小高度
    }
    
    // 根据结果数量计算基础高度
    const resultCount = sharedSearchResults.length;
    let baseHeight = 'h-64'; // 默认高度
    
    // 考虑搜索结果的内容长度
    const hasLongContent = sharedSearchResults.some(result => 
      result.sectionName && result.sectionName.length > 30
    );
    
    if (resultCount <= 2) {
      baseHeight = hasLongContent ? 'h-60' : 'h-56'; // 很少结果
    } else if (resultCount <= 5) {
      baseHeight = hasLongContent ? 'h-76' : 'h-72'; // 少量结果
    } else if (resultCount <= 10) {
      baseHeight = hasLongContent ? 'h-84' : 'h-80'; // 中等数量结果
    } else if (resultCount <= 20) {
      baseHeight = hasLongContent ? 'h-[26rem]' : 'h-96'; // 大量结果
    } else {
      baseHeight = hasLongContent ? 'h-[32rem]' : 'h-[28rem]'; // 超大量结果
    }
    
    return baseHeight;
  };
  
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
    setCurrentResultIndex(0);
  };

  // 导航到上一个搜索结果
  const goToPreviousResult = () => {
    if (currentResultIndex > 0) {
      const newIndex = currentResultIndex - 1;
      setCurrentResultIndex(newIndex);
      jumpToResult(newIndex);
    }
  };

  // 导航到下一个搜索结果
  const goToNextResult = () => {
    if (currentResultIndex < sharedSearchResults.length - 1) {
      const newIndex = currentResultIndex + 1;
      setCurrentResultIndex(newIndex);
      jumpToResult(newIndex);
    }
  };

  // 跳转到指定结果
  const jumpToResult = (index: number) => {
    if (index < 0 || index >= sharedSearchResults.length) return;
    
    const result = sharedSearchResults[index];
    const section = PDF_CONFIG.sections.find(s => s.filePath === result.sectionPath);
    if (!section) return;
    
    // 计算相对页码
    const relativePage = result.page - section.startPage + 1;
    
    // 如果需要切换章节
    if (result.sectionPath !== selectedPDF) {
      handleSelectPDF(section.filePath, section.name, false, false);
      // 延迟跳转页面，等待PDF加载
      setTimeout(() => {
        setCurrentPage(relativePage);
        setTargetPage(relativePage);
        if (pdfViewerRef.current) {
          pdfViewerRef.current.jumpToPage(relativePage);
        }
      }, 500);
    } else {
      // 直接跳转页面
      setCurrentPage(relativePage);
      setTargetPage(relativePage);
      if (pdfViewerRef.current) {
        pdfViewerRef.current.jumpToPage(relativePage);
      }
    }
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
    setCurrentResultIndex(0); // 重置为第一个结果
    
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
                <div className="w-5 h-7 relative">
                  <Image 
                    src="/brand-icon.svg" 
                    alt="IMPA Logo" 
                    fill
                    sizes="20px"
                    className="object-contain"
                    priority
                    unoptimized
                  />
                </div>
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
      <main className="max-w-full mx-auto px-4 py-6 pb-24 sm:pb-6">
        <div className={`flex flex-col lg:flex-row gap-6 ${
          // 手机端：根据搜索结果数量调整布局
          sharedSearchResults.length <= 2 ? 'lg:gap-6' : 'lg:gap-6'
        }`}>
          {/* PDF查看器 - 在移动端占满宽度，桌面端占左侧 */}
          <div className="flex-1 min-w-0 order-1 lg:order-1 lg:flex-[3] xl:flex-[4]">
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
                  
                  {/* Floating Navigation Buttons - Responsive Design, Hidden on Mobile */}
                  <div className="hidden sm:flex fixed right-2 sm:right-4 lg:right-6 top-1/2 transform -translate-y-1/2 flex-col items-center space-y-2 sm:space-y-3 lg:space-y-4 z-50 animate-fade-in">
                    {/* Previous Page Button - Smaller on Mobile */}
                    <button
                      onClick={() => pdfViewerRef.current?.jumpToPage(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="group w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl flex items-center justify-center text-gray-700 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 ease-out hover:scale-105 active:scale-95"
                      title="Previous Page (↑ or ←)"
                    >
                      <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 transition-transform duration-200 group-hover:-translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    
                    {/* Page Number Display - More Compact on Mobile */}
                    <div className="w-10 h-6 sm:w-12 sm:h-7 lg:w-14 lg:h-8 bg-blue-600 border-0 rounded-lg sm:rounded-xl shadow-lg flex items-center justify-center">
                      <span className="text-xs sm:text-xs lg:text-xs font-bold text-white tracking-wide">
                        {startPage + currentPage - 1}
                      </span>
                    </div>
                    
                    {/* Next Page Button - Smaller on Mobile */}
                    <button
                      onClick={() => pdfViewerRef.current?.jumpToPage(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                      className="group w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl flex items-center justify-center text-gray-700 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 ease-out hover:scale-105 active:scale-95"
                      title="Next Page (↓ or →)"
                    >
                      <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 transition-transform duration-200 group-hover:translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Hint Text - Desktop Only */}
                    <div className="hidden lg:block text-xs text-gray-500 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                      ↑↓ or ←→ to navigate
                    </div>
                  </div>
                  
                  {/* Mobile Bottom Navigation - Mobile Only */}
                  <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 sm:hidden">
                    {/* Navigation Controls */}
                    <div className="flex items-center justify-between px-4 py-3">
                      {/* Previous Page Button */}
                      <button
                        onClick={() => pdfViewerRef.current?.jumpToPage(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="text-sm font-medium">Prev</span>
                      </button>
                      
                      {/* Page Info */}
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Page</span>
                        <span className="px-3 py-1 bg-blue-600 text-white text-sm font-bold rounded-lg">
                          {startPage + currentPage - 1}
                        </span>
                      </div>
                      
                      {/* Next Page Button */}
                      <button
                        onClick={() => pdfViewerRef.current?.jumpToPage(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors duration-200"
                      >
                        <span className="text-sm font-medium">Next</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* Mobile Footer Info */}
                    <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                      <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                        <Image 
                          src="/brand-icon.svg" 
                          alt="IMPA Logo" 
                          width={12}
                          height={16}
                        />
                        <span>IMPA Marine Stores Guide • 8th Edition 2023</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 搜索结果 - 响应式布局优化 */}
          <div className={`w-full lg:flex-[1] xl:flex-[1] lg:min-w-[320px] lg:max-w-[480px] lg:flex-shrink-0 lg:h-screen overflow-hidden order-2 lg:order-2 transition-all duration-300 ease-in-out ${getSearchResultsHeight()}`}>
            <div className="h-full flex flex-col">
              {/* 搜索结果标题 - 仅在手机端显示 */}
              <div className="lg:hidden px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700">
                    Search Results {sharedSearchResults.length > 0 && `(${sharedSearchResults.length})`}
                  </h3>
                  {/* 手机端导航按钮 */}
                  {sharedSearchResults.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={goToPreviousResult}
                        disabled={currentResultIndex === 0}
                        className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                        title="Previous result"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <span className="text-xs text-gray-500 px-2 py-1 bg-white rounded-full">
                        {currentResultIndex + 1} / {sharedSearchResults.length}
                      </span>
                      <button
                        onClick={goToNextResult}
                        disabled={currentResultIndex === sharedSearchResults.length - 1}
                        className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                        title="Next result"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 sm:p-3">
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
                  currentResultIndex={currentResultIndex}
                  onResultIndexChange={setCurrentResultIndex}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer - Hidden on mobile to avoid conflict with bottom navigation */}
      <footer className="hidden sm:block mt-auto py-6 text-center text-sm text-gray-500 border-t border-gray-200">
        <div className="max-w-full mx-auto px-4">
          <div className="flex justify-center items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-5 relative">
                <Image 
                  src="/brand-icon.svg" 
                  alt="IMPA Logo" 
                  fill
                  sizes="16px"
                  className="object-contain"
                  unoptimized
                />
              </div>
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
