'use client';

import { useState, useCallback, useRef } from 'react';
import { FileText, Upload, Search, Home } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import UserDocumentManager from '@/components/UserDocumentManager';
import EnhancedSearchBox from '@/components/EnhancedSearchBox';
import PDFViewer, { PDFViewerRef } from '@/components/PDFViewer';
import UserDocumentFloatingButton from '@/components/UserDocumentFloatingButton';
import ThemeToggle from '@/components/ThemeToggle';
import NoSSR from '@/components/NoSSR';

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

export default function DocumentsPage() {
  const [currentDocument, setCurrentDocument] = useState<UserDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'viewer'>('list');
  const [pageInput, setPageInput] = useState('1');
  
  const pdfViewerRef = useRef<PDFViewerRef>(null);

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

  // 返回文档列表
  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setCurrentDocument(null);
  }, []);

  return (
    <NoSSR>
      <div className="min-h-screen bg-background">
        {/* 头部导航 - 只在列表页面显示 */}
        {viewMode === 'list' && (
          <header className="bg-background border-b border-border sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
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
                  </Link>
                  
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h1 className="text-xl font-bold text-foreground">PDFR</h1>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <Link
                    href="/"
                    className="flex items-center space-x-2 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Home className="h-4 w-4" />
                    <span className="hidden sm:inline">首页</span>
                  </Link>
                  
                  <Link
                    href="/search"
                    className="flex items-center space-x-2 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Search className="h-4 w-4" />
                    <span className="hidden sm:inline">文档搜索</span>
                  </Link>
                  
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </header>
        )}

        <main className={viewMode === 'viewer' ? 'h-screen' : 'max-w-7xl mx-auto px-4 py-6'}>
          {viewMode === 'list' ? (
            <div className="space-y-6">
              {/* 搜索区域 */}
              <div className="bg-card rounded-lg border border-border p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Search className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">搜索文档</h2>
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

              {/* 文档管理 */}
              <div className="bg-card rounded-lg border border-border p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Upload className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">我的文档</h2>
                </div>
                
                <UserDocumentManager
                  onDocumentSelect={handleDocumentSelect}
                />
              </div>
            </div>
          ) : (
            /* PDF查看器 - 全屏显示 */
            <div className="relative h-screen">
              {/* 精简的顶部控制栏 */}
              <div className="absolute top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
                <div className="flex items-center justify-between px-3 py-1.5">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <button
                      onClick={handleBackToList}
                      className="p-1.5 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 rounded hover:bg-muted/50"
                      title="返回列表"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    
                    <h2 className="text-xs font-medium text-foreground truncate">
                      {currentDocument?.name}
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
              {currentDocument && (
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
                    totalPages={totalPages}
                    onPreviousPage={() => pdfViewerRef.current?.jumpToPage(currentPage - 1)}
                    onNextPage={() => pdfViewerRef.current?.jumpToPage(currentPage + 1)}
                    isPreviousDisabled={currentPage <= 1}
                    isNextDisabled={currentPage >= totalPages}
                  />
                </div>
              )}
            </div>
          )}
        </main>

        {/* 底部信息 - 只在列表页面显示 */}
        {viewMode === 'list' && (
          <footer className="mt-auto py-6 border-t border-border">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex justify-center items-center space-x-3 text-xs text-muted-foreground/80">
                <div className="w-4 h-4 relative">
                  <Image 
                    src="/brand-icon.svg" 
                    alt="PDFReview Logo" 
                    fill
                    sizes="16px"
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <span className="font-medium">PDFR</span>
                <span className="text-muted-foreground/60">•</span>
                <span>用户文档管理平台</span>
                <span className="text-muted-foreground/60">•</span>
                <span>支持PDF上传、搜索和查看</span>
              </div>
            </div>
          </footer>
        )}
      </div>
    </NoSSR>
  );
}
