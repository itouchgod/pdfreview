'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PDFViewer, { PDFViewerRef } from '@/components/PDFViewer';
import SmartSearchBox from '@/components/SmartSearchBox';
import SearchResultsOnly from '@/components/SearchResultsOnly';
import ThemeToggle from '@/components/ThemeToggle';
import { PDF_CONFIG } from '@/config/pdf';
import Link from 'next/link';
import Image from 'next/image';
import { usePDFText } from '@/contexts/PDFTextContext';
import { PageCalculator } from '@/utils/pageCalculator';
import { SectionChangeHandler } from '@/types/pdf';

function SearchContent() {
  const searchParams = useSearchParams();
  const [selectedPDF, setSelectedPDF] = useState<string>(PDF_CONFIG.sections[0].filePath);
  const [selectedSectionName, setSelectedSectionName] = useState<string>(PDF_CONFIG.sections[0].name);
  const pdfViewerRef = useRef<PDFViewerRef>(null);
  
  // 用于在header和sidebar之间共享搜索结果
  const [sharedSearchResults, setSharedSearchResults] = useState<any[]>([]);
  const [sharedSearchTerm, setSharedSearchTerm] = useState('');
  const [sharedSearchMode, setSharedSearchMode] = useState<'current' | 'global'>('global');
  const [hasSearchResults, setHasSearchResults] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [targetPage, setTargetPage] = useState<number | undefined>(undefined);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  
  // 使用全局PDF文本数据
  const { textData } = usePDFText();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(() => {
    const calculator = PageCalculator.fromPath(selectedPDF);
    return calculator ? calculator.getTotalPages() : 1;
  });

  const handleTextExtracted = () => {
    // Text extracted for search functionality
  };

  const handleSearchResults = (results: unknown[]) => {
    console.log('handleSearchResults called with:', results.length, 'results');
  };

  const handleClearSearch = () => {
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

  // 统一的PDF导航函数
  const navigateToPDF = useCallback(async (pdfPath: string, pageNumber?: number) => {
    const calculator = PageCalculator.fromPath(pdfPath);
    if (!calculator) {
      console.error('Section not found:', pdfPath);
      return;
    }

    const section = calculator.getSection();
    // 如果没有提供页码，使用当前页码
    const validPage = typeof pageNumber === 'number'
      ? calculator.getValidRelativePage(pageNumber)
      : calculator.getValidRelativePage(currentPage);
    
    console.log('Navigating to PDF:', {
      fromSection: selectedPDF,
      toSection: pdfPath,
      requestedPage: pageNumber,
      validPage,
      section: section.name,
      calculation: pageNumber ? `${pageNumber} -> ${validPage}` : 'default: 1'
    });

    // 批量更新所有状态
    if (pdfPath !== selectedPDF) {
      setSelectedPDF(pdfPath);
      setSelectedSectionName(section.name);
      setTotalPages(calculator.getTotalPages());
    }

    // 更新页码状态并跳转
    setTargetPage(validPage);
    setCurrentPage(validPage);
    pdfViewerRef.current?.jumpToPage(validPage);
  }, [selectedPDF, pdfViewerRef, currentPage]);

  // 跳转到指定结果
  const jumpToResult = useCallback(async (index: number) => {
    if (index < 0 || index >= sharedSearchResults.length) return;
    
    const result = sharedSearchResults[index];
    if (!result || !result.sectionPath) return;

    const calculator = PageCalculator.fromPath(result.sectionPath);
    if (!calculator) return;
    const relativePage = calculator.getRelativePageFromResult(result);
    
    await navigateToPDF(result.sectionPath, relativePage);
  }, [sharedSearchResults, navigateToPDF]);

  // 页面跳转
  const handlePageJump = useCallback((pageNumber: number) => {
    if (pdfViewerRef.current) {
      setCurrentPage(pageNumber);
      setTargetPage(pageNumber);
      pdfViewerRef.current.jumpToPage(pageNumber);
    }
  }, []);

    // 章节切换
  const handleSectionChange: SectionChangeHandler = useCallback((sectionPath: string, pageOrReset?: number | boolean) => {
    // 如果是布尔值，转换为页码
    const targetPage = typeof pageOrReset === 'boolean' ? (pageOrReset ? 1 : undefined) : pageOrReset;
    const calculator = PageCalculator.fromPath(sectionPath);
    if (!calculator) {
      console.error('Section not found:', sectionPath);
      return;
    }
    const section = calculator.getSection();
    console.log('Handling section change:', {
      fromSection: selectedPDF,
      toSection: sectionPath,
      section: section.name,
      targetPage
    });
    // 直接传递目标页码
    navigateToPDF(sectionPath, targetPage);
  }, [navigateToPDF, selectedPDF]);

  // URL更新
  const handleUpdateURL = useCallback((params: { query?: string; section?: string; page?: number }) => {
    if (typeof window === 'undefined') return;
    
    const url = new URL(window.location.href);
    url.searchParams.delete('q');
    url.searchParams.delete('section');
    url.searchParams.delete('page');
    
    if (params.query) {
      url.searchParams.set('q', params.query);
    } else if (params.query === '') {
      // 如果搜索词为空字符串，删除参数而不是设置空值
      url.searchParams.delete('q');
    }
    if (params.section) url.searchParams.set('section', params.section);
    if (params.page) url.searchParams.set('page', params.page.toString());
    
    window.history.pushState({}, '', url.toString());
  }, []);

  // 页面变化
  const handlePageChange = useCallback((page: number, total: number) => {
    setCurrentPage(page);
    setTotalPages(total);
  }, []);

  const handleSearchResultsUpdate = useCallback((results: any[], searchTerm: string, searchMode: 'current' | 'global') => {
    if (!results || !Array.isArray(results)) return;

    // 如果搜索结果相同，不更新状态
    if (JSON.stringify(results) === JSON.stringify(sharedSearchResults)) {
      return;
    }

    // 批量更新搜索状态
    setSharedSearchResults(results);
    setSharedSearchTerm(searchTerm);
    setSharedSearchMode(searchMode);
    setHasSearchResults(results.length > 0);
    setIsSearchActive(true);
    setCurrentResultIndex(0);
  }, [sharedSearchResults]);


  // 搜索函数
  const searchInAllSections = useCallback((query: string, sectionsText: Record<string, string>) => {
    const results: any[] = [];
    const searchTerm = query.toLowerCase();
    const searchTerms = searchTerm.split(' ').filter(Boolean);

    Object.entries(sectionsText).forEach(([sectionPath, text]) => {
      const lines = text.split('\n');
      let pageNumber = 1;
      
      lines.forEach((line) => {
        const pageMatch = line.match(/--- 第 (\d+) 页 ---/);
        if (pageMatch) {
          pageNumber = parseInt(pageMatch[1]);
          return;
        }
        
        const matches = searchTerms.every(term => 
          line.toLowerCase().includes(term)
        );
        
        if (matches) {
          const pageInfo = PageCalculator.findPageInfo(pageNumber);
          if (pageInfo && pageInfo.section.filePath === sectionPath) {
            results.push({
              page: pageNumber, // 保存绝对页码
              text: line.trim(),
              index: results.length,
              context: line.trim(),
              sectionName: pageInfo.section.name,
              sectionPath: sectionPath,
              category: 'search'
            });
          }
        }
      });
    });
    
    return results;
  }, []);

  // 从URL参数获取搜索词
  const searchQuery = searchParams?.get('q') || '';

  // 当URL中的搜索词变化时，自动执行搜索
  useEffect(() => {
    if (!textData || !Object.keys(textData).length) return;
    
    // 如果搜索词为空，批量更新状态
    if (!searchQuery) {
      setSharedSearchResults([]);
      setSharedSearchTerm('');
      setIsSearchActive(false);
      setHasSearchResults(false);
      setCurrentResultIndex(0);
      return;
    }
    
    const searchResults = searchInAllSections(searchQuery, textData);
    if (searchResults && searchResults.length > 0) {
      // 批量更新搜索状态
      setSharedSearchResults(searchResults);
      setSharedSearchTerm(searchQuery);
      setSharedSearchMode('global');
      setHasSearchResults(true);
      setIsSearchActive(true);
      
      // 只在初始加载时跳转到第一个结果
      const isInitialLoad = !sharedSearchResults.length;
      if (isInitialLoad) {
        setCurrentResultIndex(0);
        const firstResult = searchResults[0];
        if (firstResult) {
          const calculator = PageCalculator.fromPath(firstResult.sectionPath);
          if (calculator) {
            const relativePage = calculator.getRelativePageFromResult(firstResult);
            // 直接切换到正确的章节和页面
            navigateToPDF(firstResult.sectionPath, relativePage);
          }
        }
      }
    } else {
      // 如果没有搜索结果，批量更新状态
      setSharedSearchResults([]);
      setSharedSearchTerm('');
      setIsSearchActive(false);
      setHasSearchResults(false);
      setCurrentResultIndex(0);
    }
  }, [searchQuery, textData, searchInAllSections, navigateToPDF, sharedSearchResults.length]);

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b border-border">
        <div className="max-w-full mx-auto px-4 py-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
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
            
            {/* 主题切换按钮 */}
            <div className="flex-shrink-0">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-full mx-auto px-4 py-6 pb-24 sm:pb-6">
        <div className={`flex flex-col lg:flex-row gap-6 ${
          isSearchActive && sharedSearchResults.length > 0 ? 'lg:gap-6' : ''
        }`}>
          <div className="flex-1 min-w-0 order-1 lg:order-1 lg:flex-[3] xl:flex-[4]">
            <div className="px-6 py-4 border-b border-border bg-card">
              <div className="flex items-center">
                <div className="flex items-center">
                  <div className="relative">
                    <select
                      value={selectedPDF || ''}
                      onChange={(e) => {
                        const section = PDF_CONFIG.sections.find(s => s.filePath === e.target.value);
                        if (section) {
                          // 切换章节时总是从第一页开始
                          navigateToPDF(section.filePath, 1);
                        }
                      }}
                      className="appearance-none bg-transparent border-none outline-none cursor-pointer text-base font-medium text-card-foreground hover:text-foreground focus:text-foreground min-w-0 max-w-full pr-8 py-2 transition-colors duration-200"
                    >
                      {PDF_CONFIG.sections.map((section) => (
                        <option key={section.name} value={section.filePath}>
                          {section.title || section.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
              
            <div className="p-1 flex justify-center relative bg-background">
              {isSearchActive && sharedSearchTerm && !hasSearchResults ? (
                <div className="flex flex-col items-center justify-center h-96">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="h-6 w-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <p className="text-base text-muted-foreground font-medium mb-1">No results found</p>
                    <p className="text-sm text-muted-foreground/70">Try different keywords</p>
                  </div>
                </div>
              ) : (
                <>
                  <PDFViewer
                    ref={pdfViewerRef}
                    pdfUrl={selectedPDF}
                    initialPage={targetPage || 1}
                    onTextExtracted={handleTextExtracted}
                    onPageChange={handlePageChange}
                  />
                  
                  <div className="hidden sm:flex fixed right-4 sm:right-6 lg:right-8 xl:right-10 top-1/2 transform -translate-y-1/2 flex-col items-center space-y-3 sm:space-y-4 lg:space-y-5 z-50 animate-fade-in">
                    <button
                      onClick={() => pdfViewerRef.current?.jumpToPage(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="group w-11 h-11 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-card/95 hover:bg-card border border-border hover:border-primary rounded-2xl shadow-lg hover:shadow-primary/20 flex items-center justify-center text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 ease-out hover:scale-105 active:scale-95 backdrop-blur-sm"
                      title="Previous Page (↑ or ←)"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 transition-all duration-300 group-hover:-translate-y-1 group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    
                    <div className="w-11 h-7 sm:w-12 sm:h-8 lg:w-14 lg:h-9 bg-primary/95 backdrop-blur-sm hover:bg-primary rounded-2xl shadow-lg hover:shadow-primary/20 flex items-center justify-center transition-all duration-300 hover:scale-105 cursor-pointer">
                      <span className="text-xs sm:text-xs lg:text-xs font-bold text-primary-foreground tracking-wide">
                        {(() => {
                          const calculator = PageCalculator.fromPath(selectedPDF);
                          if (!calculator) return currentPage;
                          return calculator.toAbsolutePage(currentPage);
                        })()}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => pdfViewerRef.current?.jumpToPage(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                      className="group w-11 h-11 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-card/95 hover:bg-card border border-border hover:border-primary rounded-2xl shadow-lg hover:shadow-primary/20 flex items-center justify-center text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 ease-out hover:scale-105 active:scale-95 backdrop-blur-sm"
                      title="Next Page (↓ or →)"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 transition-all duration-300 group-hover:translate-y-1 group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    <div className="hidden lg:block text-xs text-muted-foreground text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                      ↑↓ or ←→ to navigate
                    </div>
                  </div>
                  
                  <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-40 sm:hidden">
                    <div className="flex items-center justify-between px-4 py-3">
                      <button
                        onClick={() => pdfViewerRef.current?.jumpToPage(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="flex items-center space-x-2 px-4 py-2 bg-secondary hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors duration-200 text-secondary-foreground"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="text-sm font-medium">Prev</span>
                      </button>
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">Page</span>
                        <span className="px-3 py-1 bg-primary text-primary-foreground text-sm font-bold rounded-lg">
                        {(() => {
                          const calculator = PageCalculator.fromPath(selectedPDF);
                          if (!calculator) return currentPage;
                          return calculator.toAbsolutePage(currentPage);
                        })()}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => pdfViewerRef.current?.jumpToPage(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className="flex items-center space-x-2 px-4 py-2 bg-secondary hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors duration-200 text-secondary-foreground"
                      >
                        <span className="text-sm font-medium">Next</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="px-4 py-2 bg-muted border-t border-border">
                      <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
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

          {(isSearchActive && sharedSearchResults.length > 0 && sharedSearchTerm) && (
            <div className="w-full lg:flex-[1] xl:flex-[1] lg:min-w-[320px] lg:max-w-[480px] lg:flex-shrink-0 lg:h-screen overflow-hidden order-2 lg:order-2 transition-all duration-300 ease-in-out h-[480px] lg:h-screen">
              <div className="h-full flex flex-col">
                <div className="lg:hidden px-4 py-3 bg-muted border-b border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-card-foreground">
                      Search Results ({sharedSearchResults.length})
                    </h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={goToPreviousResult}
                        disabled={currentResultIndex === 0}
                        className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                        title="Previous result"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <span className="text-xs text-muted-foreground px-2 py-1 bg-card rounded-full">
                        {currentResultIndex + 1} / {sharedSearchResults.length}
                      </span>
                      <button
                        onClick={goToNextResult}
                        disabled={currentResultIndex === sharedSearchResults.length - 1}
                        className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                        title="Next result"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
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
          )}
        </div>
      </main>

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