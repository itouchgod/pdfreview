'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PDFViewer, { PDFViewerRef } from '@/components/PDFViewer';
import SmartSearchBox from '@/components/SmartSearchBox';
import SearchResultsOnly from '@/components/SearchResultsOnly';
import { PDF_CONFIG } from '@/config/pdf';
import Link from 'next/link';
import Image from 'next/image';
import { usePDFText } from '@/contexts/PDFTextContext';

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

  // 跳转到指定结果
  const jumpToResult = (index: number) => {
    if (index < 0 || index >= sharedSearchResults.length) return;
    
    const result = sharedSearchResults[index];
    const section = PDF_CONFIG.sections.find(s => s.filePath === result.sectionPath);
    if (!section) return;
    
    const relativePage = result.relativePage;
    
    console.log('Jump To Result Debug:', {
      resultPage: result.page,
      relativePage,
      sectionStartPage: section.startPage,
      sectionName: section.name,
      sectionPath: section.filePath
    });
    
    if (result.sectionPath !== selectedPDF) {
      handleSelectPDF(section.filePath, section.name, false, false);
      setTimeout(() => {
        setCurrentPage(relativePage);
        setTargetPage(relativePage);
        if (pdfViewerRef.current) {
          pdfViewerRef.current.jumpToPage(relativePage);
        }
      }, 500);
    } else {
      setCurrentPage(relativePage);
      setTargetPage(relativePage);
      if (pdfViewerRef.current) {
        pdfViewerRef.current.jumpToPage(relativePage);
      }
    }
  };

  const handleSelectPDF = useCallback((pdfPath: string, sectionName: string, resetToFirstPage: boolean = true, clearSearch: boolean = false) => {
    console.log('handleSelectPDF called:', { pdfPath, sectionName, resetToFirstPage, clearSearch });
    setSelectedPDF(pdfPath);
    setSelectedSectionName(sectionName);
    
    const section = PDF_CONFIG.sections.find(s => s.filePath === pdfPath);
    if (section) {
      setTotalPages(section.endPage - section.startPage + 1);
      setStartPage(section.startPage);
    }
    
    if (resetToFirstPage) {
      setCurrentPage(1);
      setTargetPage(1);
    }
    
    if (clearSearch) {
      setIsSearchActive(false);
      setSharedSearchResults([]);
      setSharedSearchTerm('');
      setHasSearchResults(false);
    }
  }, []);

  const handlePageJump = useCallback((pageNumber: number) => {
    if (pdfViewerRef.current) {
      setCurrentPage(pageNumber);
      pdfViewerRef.current.jumpToPage(pageNumber);
    }
  }, []);

  const handleSectionChange = useCallback((sectionPath: string, resetToFirstPage: boolean = true) => {
    const section = PDF_CONFIG.sections.find(s => s.filePath === sectionPath);
    if (section) {
      handleSelectPDF(section.filePath, section.name, resetToFirstPage, false);
    }
  }, [handleSelectPDF]);

  const handleUpdateURL = useCallback((params: { query?: string; section?: string; page?: number }) => {
    if (typeof window === 'undefined') return;
    
    const url = new URL(window.location.href);
    url.searchParams.delete('q');
    url.searchParams.delete('section');
    url.searchParams.delete('page');
    
    if (params.query) url.searchParams.set('q', params.query);
    if (params.section) url.searchParams.set('section', params.section);
    if (params.page) url.searchParams.set('page', params.page.toString());
    
    window.history.pushState({}, '', url.toString());
  }, []);

  const handlePageChange = useCallback((page: number, total: number) => {
    setCurrentPage(page);
    setTotalPages(total);
  }, []);

  const handleSearchResultsUpdate = useCallback((results: any[], searchTerm: string, searchMode: 'current' | 'global') => {
    console.log('handleSearchResultsUpdate called:', { 
      resultsCount: results.length, 
      searchTerm, 
      searchMode
    });

    if (!results || !Array.isArray(results)) return;

    setSharedSearchResults(results);
    setSharedSearchTerm(searchTerm);
    setSharedSearchMode(searchMode);
    setHasSearchResults(results.length > 0);
    setIsSearchActive(true);
    setCurrentResultIndex(0);
    
    if (results.length > 0) {
      const firstResult = results[0];
      const section = PDF_CONFIG.sections.find(s => s.filePath === firstResult.sectionPath);
      if (section) {
        if (firstResult.sectionPath !== selectedPDF) {
          handleSelectPDF(section.filePath, section.name, false, false);
          setTimeout(() => {
            const relativePage = firstResult.relativePage || (firstResult.page - section.startPage + 1);
            setTargetPage(relativePage);
            setCurrentPage(relativePage);
            if (pdfViewerRef.current) {
              pdfViewerRef.current.jumpToPage(relativePage);
            }
          }, 500);
        } else {
          const relativePage = firstResult.relativePage || (firstResult.page - section.startPage + 1);
          setTargetPage(relativePage);
          setCurrentPage(relativePage);
          if (pdfViewerRef.current) {
            pdfViewerRef.current.jumpToPage(relativePage);
          }
        }
      }
    }
  }, [handleSelectPDF, selectedPDF]);

  // 从URL参数获取搜索词
  const searchQuery = searchParams?.get('q') || '';

  // 当URL中的搜索词变化时，自动执行搜索
  useEffect(() => {
    if (!searchQuery || !textData || !Object.keys(textData).length) return;
    
    const searchResults = searchInAllSections(searchQuery, textData);
    if (searchResults && searchResults.length > 0) {
      handleSearchResultsUpdate(searchResults, searchQuery, 'global');
    }
  }, [searchQuery, textData, handleSearchResultsUpdate]);

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
          const section = PDF_CONFIG.sections.find(s => s.filePath === sectionPath);
          if (section) {
            const relativePage = pageNumber - section.startPage + 1;
            results.push({
              page: pageNumber,
              relativePage,
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
  }, []);

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
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-200">
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
          </div>
        </div>
      </header>

      <main className="max-w-full mx-auto px-4 py-6 pb-24 sm:pb-6">
        <div className={`flex flex-col lg:flex-row gap-6 ${
          isSearchActive && sharedSearchResults.length > 0 ? 'lg:gap-6' : ''
        }`}>
          <div className="flex-1 min-w-0 order-1 lg:order-1 lg:flex-[3] xl:flex-[4]">
            <div className="px-6 py-4 border-b border-gray-100 bg-white">
              <div className="flex items-center">
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
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
              
            <div className="p-1 flex justify-center relative bg-white">
              {isSearchActive && sharedSearchTerm && !hasSearchResults ? (
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
                      className="group w-11 h-11 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-white/95 hover:bg-white border border-gray-100 hover:border-blue-200 rounded-2xl shadow-lg hover:shadow-blue-100/50 flex items-center justify-center text-gray-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 ease-out hover:scale-105 active:scale-95 backdrop-blur-sm"
                      title="Previous Page (↑ or ←)"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 transition-all duration-300 group-hover:-translate-y-1 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    
                    <div className="w-11 h-7 sm:w-12 sm:h-8 lg:w-14 lg:h-9 bg-blue-600/95 backdrop-blur-sm hover:bg-blue-700 rounded-2xl shadow-lg hover:shadow-blue-200/50 flex items-center justify-center transition-all duration-300 hover:scale-105 cursor-pointer">
                      <span className="text-xs sm:text-xs lg:text-xs font-bold text-white tracking-wide">
                        {startPage + currentPage - 1}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => pdfViewerRef.current?.jumpToPage(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                      className="group w-11 h-11 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-white/95 hover:bg-white border border-gray-100 hover:border-blue-200 rounded-2xl shadow-lg hover:shadow-blue-100/50 flex items-center justify-center text-gray-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 ease-out hover:scale-105 active:scale-95 backdrop-blur-sm"
                      title="Next Page (↓ or →)"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 transition-all duration-300 group-hover:translate-y-1 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    <div className="hidden lg:block text-xs text-gray-500 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                      ↑↓ or ←→ to navigate
                    </div>
                  </div>
                  
                  <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 sm:hidden">
                    <div className="flex items-center justify-between px-4 py-3">
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
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Page</span>
                        <span className="px-3 py-1 bg-blue-600 text-white text-sm font-bold rounded-lg">
                          {startPage + currentPage - 1}
                        </span>
                      </div>
                      
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

          {(isSearchActive && sharedSearchResults.length > 0) && (
            <div className={`w-full lg:flex-[1] xl:flex-[1] lg:min-w-[320px] lg:max-w-[480px] lg:flex-shrink-0 lg:h-screen overflow-hidden order-2 lg:order-2 transition-all duration-300 ease-in-out h-[${getSearchResultsHeight()}]`}>
              <div className="h-full flex flex-col">
                <div className="lg:hidden px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-700">
                      Search Results ({sharedSearchResults.length})
                    </h3>
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