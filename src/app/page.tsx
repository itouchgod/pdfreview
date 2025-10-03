'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, Upload, Home } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePDFText } from '@/contexts/PDFTextContext';
import ThemeToggle from '@/components/ThemeToggle';
import NoSSR from '@/components/NoSSR';
// LoadingScreen不再需要，因为不再加载IMPA数据
import UserDocumentManager from '@/components/UserDocumentManager';
import EnhancedSearchBox from '@/components/EnhancedSearchBox';
import PDFViewer, { PDFViewerRef } from '@/components/PDFViewer';
import UserDocumentFloatingButton from '@/components/UserDocumentFloatingButton';

interface UserDocument {
  id: string;
  name: string;
  originalName: string;
  size: number;
  url: string;
  uploadTime: Date;
  lastViewed?: Date;
  viewCount: number;
  category?: string;
  tags: string[];
}

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'home' | 'viewer'>('home');
  const [currentDocument, setCurrentDocument] = useState<UserDocument | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  const router = useRouter();
  const pdfViewerRef = useRef<PDFViewerRef>(null);
  const { loadingStatus, startLoading, isReady, hasStartedLoading } = usePDFText();

  // 处理客户端挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 页面加载时开始加载PDF文本（只在首次访问时）
  useEffect(() => {
    if (!hasStartedLoading) {
      startLoading();
    }
  }, [hasStartedLoading, startLoading]);

  // 处理文档选择
  const handleDocumentSelect = useCallback((document: UserDocument) => {
    setCurrentDocument(document);
    setViewMode('viewer');
    setCurrentPage(1);
  }, []);

  // 处理搜索
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
    
    // 这里可以实现实际的搜索逻辑
    // 目前只是模拟搜索
    setTimeout(() => {
      setSearchResults([]);
      setIsSearching(false);
    }, 1000);
  }, []);

  // 处理搜索清除
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  }, []);

  // 处理历史选择
  const handleHistorySelect = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // 处理页面变化
  const handlePageChange = useCallback((page: number, total: number) => {
    setCurrentPage(page);
    setTotalPages(total);
    setPageInput(page.toString());
  }, []);

  // 返回首页
  const handleBackToHome = useCallback(() => {
    setViewMode('home');
    setCurrentDocument(null);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const handleKeywordClick = (keyword: string) => {
    router.push(`/search?q=${encodeURIComponent(keyword)}`);
  };

  const commonKeywords = [
    'document', 'pdf', 'search', 'view', 'read', 'download',
    'upload', 'manage', 'organize', 'categorize', 'tag', 'bookmark',
    'share', 'export', 'print', 'zoom', 'navigate', 'bookmark'
  ];

  // 简化加载逻辑，不再需要复杂的加载屏幕
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 relative mx-auto mb-4">
            <Image 
              src="/brand-icon.svg" 
              alt="PDFR Logo" 
              fill
              sizes="32px"
              className="object-contain animate-pulse"
            />
          </div>
          <p className="text-muted-foreground">Loading PDFR...</p>
        </div>
      </div>
    );
  }

  // PDF查看器模式
  if (viewMode === 'viewer' && currentDocument) {
    return (
      <NoSSR>
        <div className="min-h-screen bg-background">
          {/* 精简的顶部控制栏 */}
          <div className="absolute top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
            <div className="flex items-center justify-between px-3 py-1.5">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <button
                  onClick={handleBackToHome}
                  className="p-1.5 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 rounded hover:bg-muted/50"
                  title="返回首页"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <h2 className="text-xs font-medium text-foreground truncate">
                  {currentDocument.name}
                </h2>
              </div>
              
              <div className="flex items-center space-x-1 flex-shrink-0">
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={pageInput}
                  onChange={(e) => {
                    setPageInput(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const page = parseInt(pageInput);
                      if (page >= 1 && page <= totalPages) {
                        pdfViewerRef.current?.jumpToPage(page);
                      }
                    }
                  }}
                  onBlur={(e) => {
                    // 失去焦点时跳转到输入的页码
                    const page = parseInt(pageInput);
                    if (page >= 1 && page <= totalPages) {
                      pdfViewerRef.current?.jumpToPage(page);
                    } else {
                      // 如果输入无效，恢复到当前页码
                      setPageInput(currentPage.toString());
                    }
                  }}
                  className="w-10 px-1 py-0.5 text-xs text-center bg-background/50 border border-border/50 rounded focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 hover:bg-background/80 transition-colors"
                  title="输入页码跳转（Enter键或失去焦点时跳转）"
                />
                <span className="text-xs text-muted-foreground/70">/ {totalPages}</span>
              </div>
            </div>
          </div>

          {/* PDF查看器 - 全屏显示 */}
          <div className="absolute inset-0 pt-10">
            <PDFViewer
              ref={pdfViewerRef}
              pdfUrl={currentDocument.url}
              initialPage={1}
              onPageChange={handlePageChange}
            />
            
            {/* 悬浮按钮 - 全平台显示 */}
            <UserDocumentFloatingButton
              currentPage={currentPage}
              selectedPDF={currentDocument.url}
              totalPages={totalPages}
              onPreviousPage={() => pdfViewerRef.current?.jumpToPage(currentPage - 1)}
              onNextPage={() => pdfViewerRef.current?.jumpToPage(currentPage + 1)}
              isPreviousDisabled={currentPage <= 1}
              isNextDisabled={currentPage >= totalPages}
            />
          </div>
        </div>
      </NoSSR>
    );
  }

  // 首页模式
  return (
    <NoSSR>
      <div className="min-h-screen bg-background flex flex-col">
        {/* 头部导航 */}
        <header className="bg-background border-b border-border sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 relative">
                  <Image 
                    src="/brand-icon.svg" 
                    alt="PDFR Logo" 
                    fill
                    sizes="32px"
                    className="object-contain"
                    priority
                    unoptimized
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h1 className="text-xl font-bold text-foreground">PDFR</h1>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <Link
                  href="/search"
                  className="flex items-center space-x-2 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">搜索</span>
                </Link>
                
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
          <div className="space-y-8">
            {/* 快速搜索区域 */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Search className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">快速搜索</h2>
              </div>
              
              <form onSubmit={handleSearchSubmit} className="relative max-w-2xl">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      id="search-input"
                      name="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="搜索文档内容、名称或标签..."
                      className="w-full pl-6 pr-24 py-4 text-lg bg-background rounded-full border border-border focus:outline-none focus:shadow-lg focus:border-primary transition-all duration-200 hover:shadow-md text-foreground placeholder:text-muted-foreground"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                      {/* 清除按钮 */}
                      {searchTerm && (
                        <>
                          <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="p-2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          {/* 分隔线 */}
                          <div className="h-6 w-px bg-border"></div>
                        </>
                      )}
                      {/* 搜索按钮 */}
                      <button
                        type="submit"
                        className="p-2 text-muted-foreground hover:text-primary transition-all duration-200"
                      >
                        <Search className="h-6 w-6" />
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* 高级搜索区域 */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Search className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">高级搜索</h2>
              </div>
              
              <EnhancedSearchBox
                onSearch={handleSearch}
                onClear={handleClearSearch}
                onHistorySelect={handleHistorySelect}
                placeholder="搜索文档内容、名称或标签..."
                showAdvancedOptions={true}
              />
              
              {isSearching && (
                <div className="mt-4 text-center">
                  <div className="inline-flex items-center space-x-2 text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span>正在搜索...</span>
                  </div>
                </div>
              )}
              
              {searchQuery && !isSearching && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">
                    搜索 &quot;{searchQuery}&quot; 的结果: {searchResults.length} 个匹配项
                  </p>
                </div>
              )}
            </div>

            {/* 文档管理区域 */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Upload className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">我的文档</h2>
              </div>
              
              <UserDocumentManager
                onDocumentSelect={handleDocumentSelect}
              />
            </div>

            {/* 常用功能 */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-foreground mb-4">常用功能</h3>
                <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
                  {commonKeywords.map((keyword, index) => (
                    <button
                      key={index}
                      onClick={() => handleKeywordClick(keyword)}
                      className="px-4 py-2 text-sm bg-secondary hover:bg-primary/10 hover:text-primary text-muted-foreground rounded-full transition-colors border border-border hover:border-primary/50"
                    >
                      {keyword}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="block mt-auto py-4 border-t border-border">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex justify-center items-center space-x-3 text-xs text-muted-foreground/80">
              <div className="w-4 h-4 relative">
                <Image 
                  src="/brand-icon.svg" 
                  alt="PDF Logo" 
                  fill
                  sizes="16px"
                  className="object-contain"
                />
              </div>
              <span className="font-medium hidden sm:inline">PDFR</span>
              <span className="text-muted-foreground/60">•</span>
              <span>v1.0.0</span>
              <span className="text-muted-foreground/60">•</span>
              <span className="text-muted-foreground/70">Universal PDF Viewer</span>
            </div>
          </div>
        </footer>
      </div>
    </NoSSR>
  );
}