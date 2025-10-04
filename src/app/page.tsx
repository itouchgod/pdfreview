'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { usePDFText } from '@/contexts/PDFTextContext';
import ThemeToggle from '@/components/ThemeToggle';
import NoSSR from '@/components/NoSSR';
import UserDocumentManager from '@/components/UserDocumentManager';
import PDFViewer, { PDFViewerRef } from '@/components/PDFViewer';
import UserDocumentFloatingButton from '@/components/UserDocumentFloatingButton';
import FileUploadModal from '@/components/FileUploadModal';
import SearchResultsOnly from '@/components/SearchResultsOnly';
import { PDFTextExtractor } from '@/lib/pdfTextExtractor';

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
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'home' | 'viewer'>('home');
  const [currentDocument, setCurrentDocument] = useState<UserDocument | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [refreshDocuments, setRefreshDocuments] = useState(0);
  
  // 搜索相关状态
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasSearchResults, setHasSearchResults] = useState(false);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const pdfViewerRef = useRef<PDFViewerRef>(null);
  const { startLoading } = usePDFText();
  const pdfTextExtractor = PDFTextExtractor.getInstance();

  // 处理客户端挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 页面加载时开始加载PDF文本
  useEffect(() => {
    startLoading();
  }, [startLoading]);

  // 处理文档选择
  const handleDocumentSelect = useCallback((document: UserDocument) => {
    setCurrentDocument(document);
    setViewMode('viewer');
    setCurrentPage(1);
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

  // 处理文件上传
  const handleFileUploaded = useCallback(() => {
    // 文件上传成功后，触发文档列表刷新
    setRefreshDocuments(prev => prev + 1);
  }, []);

  // 处理文件移除
  const handleFileRemoved = useCallback(() => {
    // 这里可以添加文件移除后的处理逻辑
  }, []);

  // 搜索处理函数
  const handleSearchResults = useCallback((results: any[], searchQuery: string) => {
    setSearchResults(results);
    setSearchTerm(searchQuery);
    setHasSearchResults(results.length > 0);
    setShowSearchResults(true);
    
    if (results.length > 0) {
      setCurrentResultIndex(0);
      // 跳转到第一个搜索结果
      const firstResult = results[0];
      if (firstResult.page) {
        pdfViewerRef.current?.jumpToPage(firstResult.page);
      }
    }
  }, []);


  // 执行搜索
  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim() || !currentDocument) return;

    try {
      // 确保PDF文本已提取
      if (!pdfTextExtractor.hasCachedText(currentDocument.url)) {
        const extractResult = await pdfTextExtractor.extractTextFromPDF(currentDocument.url);
        if (!extractResult) {
          console.warn('Failed to extract text from PDF, search may be limited');
          return;
        }
      }

      // 搜索PDF内容
      const results = pdfTextExtractor.searchInPDF(currentDocument.url, searchTerm);
      
      // 转换为SearchResult格式（用户文档不需要章节信息）
      const formattedResults = results.map((result, index) => ({
        page: result.page,
        text: result.text,
        context: result.context,
        index
      }));

      handleSearchResults(formattedResults, searchTerm);
    } catch (error: any) {
      console.error('Search failed:', error);
      
      // 如果是blob URL过期错误，显示友好提示
      if (error.name === 'UnexpectedResponseException' || 
          error.message?.includes('ERR_FILE_NOT_FOUND') ||
          error.message?.includes('Failed to fetch')) {
        alert('PDF文件可能已过期，请刷新页面后重试搜索');
      }
    }
  }, [searchTerm, currentDocument, pdfTextExtractor, handleSearchResults]);

  // 搜索结果导航
  const goToPreviousResult = useCallback(() => {
    if (currentResultIndex > 0) {
      const newIndex = currentResultIndex - 1;
      setCurrentResultIndex(newIndex);
      const result = searchResults[newIndex];
      if (result.page) {
        pdfViewerRef.current?.jumpToPage(result.page);
      }
    }
  }, [currentResultIndex, searchResults]);

  const goToNextResult = useCallback(() => {
    if (currentResultIndex < searchResults.length - 1) {
      const newIndex = currentResultIndex + 1;
      setCurrentResultIndex(newIndex);
      const result = searchResults[newIndex];
      if (result.page) {
        pdfViewerRef.current?.jumpToPage(result.page);
      }
    }
  }, [currentResultIndex, searchResults]);

  // 分组搜索结果
  const getGroupedResults = useCallback(() => {
    const groups = new Map();
    searchResults.forEach((result, index) => {
      const key = `${result.section || 'Unknown'}-${result.page}-${index}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key: key,
          section: result.section || 'Unknown',
          sectionName: result.section || null,
          sectionPath: result.section || 'Unknown',
          page: result.page,
          results: []
        });
      }
      groups.get(key).results.push({
        ...result,
        sectionName: result.section || null,
        sectionPath: result.section || 'Unknown',
        category: 'user-document'
      });
    });
    return Array.from(groups.values()).sort((a, b) => a.page - b.page);
  }, [searchResults]);


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
              
              {/* 右上角搜索图标 - 仅桌面端 */}
              <div className="hidden lg:flex items-center space-x-2">
                <button
                  onClick={() => setShowSearchResults(!showSearchResults)}
                  className="p-1.5 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 rounded hover:bg-muted/50"
                  title={showSearchResults ? "隐藏搜索结果" : "显示搜索结果"}
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>


          {/* PDF查看器 - 全屏显示 */}
          <div className={`absolute inset-0 pt-10 ${showSearchResults ? 'lg:pr-80' : ''} transition-all duration-300`}>
            <PDFViewer
              ref={pdfViewerRef}
              pdfUrl={currentDocument.url}
              initialPage={1}
              onPageChange={handlePageChange}
              onLinkClick={(pageNumber) => {
                pdfViewerRef.current?.jumpToPage(pageNumber);
              }}
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
            
            {/* 页码显示和搜索图标 - 小屏时在同一行 */}
            <div className="absolute bottom-4 left-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2">
              <div className="flex items-center justify-between">
                {/* 页码输入区域 */}
                <div className="flex items-center space-x-2">
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
                    onBlur={() => {
                      // 失去焦点时跳转到输入的页码
                      const page = parseInt(pageInput);
                      if (page >= 1 && page <= totalPages) {
                        pdfViewerRef.current?.jumpToPage(page);
                      } else {
                        // 如果输入无效，恢复到当前页码
                        setPageInput(currentPage.toString());
                      }
                    }}
                    className="w-12 px-2 py-1 text-sm text-center bg-background/50 border border-border/50 rounded focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 hover:bg-background/80 transition-colors"
                    title="输入页码跳转（Enter键或失去焦点时跳转）"
                  />
                  <span className="text-sm text-muted-foreground">/ {totalPages}</span>
                </div>
                
                {/* 搜索图标 - 仅在小屏时显示 */}
                <div className="lg:hidden">
                  <button
                    onClick={() => setShowSearchResults(!showSearchResults)}
                    className="p-2 bg-background/50 border border-border/50 rounded-full hover:bg-background/80 transition-colors"
                    title={showSearchResults ? "隐藏搜索" : "显示搜索"}
                  >
                    <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 移动端搜索界面 - 极简设计 */}
          {showSearchResults && (
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-40 max-h-[50vh]">
              <div className="h-full flex flex-col">
                {/* 极简搜索输入 */}
                <div className="p-2 border-b border-border">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleSearch();
                          }
                        }}
                        placeholder="搜索..."
                        className="w-full px-3 py-2 pr-16 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/50"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                      />
                      {/* 清空按钮 - 在输入框右侧 */}
                      {searchTerm && (
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setSearchResults([]);
                            setHasSearchResults(false);
                          }}
                          className="absolute right-8 top-1/2 transform -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                          title="清空"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                      {/* 收缩按钮 - 在输入框最右侧 */}
                      <button
                        onClick={() => {
                          setShowSearchResults(false);
                        }}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                        title="收缩搜索"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* 搜索按钮 */}
                    <button
                      onClick={handleSearch}
                      disabled={!searchTerm.trim()}
                      className="group relative px-4 py-2 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-lg hover:from-primary/90 hover:to-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md disabled:shadow-none transform hover:scale-105 disabled:scale-100"
                    >
                      <div className="flex items-center space-x-1.5">
                        <svg className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span>搜索</span>
                      </div>
                      {/* 悬停时的发光效果 */}
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/20 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                    </button>
                    
                    {/* 翻页控制 - 仅在有搜索结果时显示 */}
                    {hasSearchResults && getGroupedResults().length > 0 && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={goToPreviousResult}
                          disabled={currentResultIndex === 0}
                          className="p-1.5 rounded border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="上一个结果"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        
                        <span className="text-xs text-muted-foreground px-1 min-w-[3rem] text-center">
                          {currentResultIndex + 1}/{getGroupedResults().length}
                        </span>
                        
                        <button
                          onClick={goToNextResult}
                          disabled={currentResultIndex >= getGroupedResults().length - 1}
                          className="p-1.5 rounded border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="下一个结果"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 极简搜索结果 */}
                <div className="flex-1 overflow-y-auto">
                  {!searchTerm ? (
                    <div className="flex items-center justify-center h-full p-4">
                      <p className="text-sm text-muted-foreground">输入关键词搜索</p>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="flex items-center justify-center h-full p-4">
                      <p className="text-sm text-muted-foreground">未找到 "{searchTerm}" 的结果</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-2">
                      {getGroupedResults().map((group, index) => (
                        <div
                          key={group.key}
                          onClick={() => {
                            pdfViewerRef.current?.jumpToPage(group.page);
                            setCurrentResultIndex(index);
                          }}
                          className={`group cursor-pointer transition-all duration-200 border-b border-border/20 last:border-b-0 ${
                            index === currentResultIndex 
                              ? 'bg-primary/15 shadow-sm' 
                              : 'hover:bg-accent/50'
                          }`}
                        >
                          <div className="px-2 py-1.5">
                            <div className="flex items-center space-x-1.5">
                              {/* 页码标签 */}
                              <div className="flex-shrink-0">
                                <span className={`inline-flex items-center justify-center w-8 h-5 rounded text-xs font-semibold transition-all duration-200 ${
                                  index === currentResultIndex 
                                    ? 'bg-primary/80 text-primary-foreground shadow-sm' 
                                    : 'bg-muted text-muted-foreground group-hover:bg-primary/30 group-hover:text-primary'
                                }`}>
                                  P{group.page}
                                </span>
                              </div>
                              
                              {/* 搜索匹配文本内容 */}
                              <div className="flex-1 min-w-0">
                                <div className={`text-xs font-normal transition-colors duration-200 leading-tight ${
                                  index === currentResultIndex 
                                    ? 'text-primary/90' 
                                    : 'text-card-foreground group-hover:text-foreground'
                                }`}>
                                  <div className="truncate">
                                    {(() => {
                                      const firstResult = group.results[0];
                                      if (!firstResult) return 'No content found';
                                      
                                      // 优先显示context（关键词上下文），如果为空则显示text
                                      const displayText = firstResult.context || firstResult.text || 'No content found';
                                      
                                      // 如果文本太长，截断并添加省略号
                                      const maxLength = 100;
                                      if (displayText.length > maxLength) {
                                        return displayText.substring(0, maxLength) + '...';
                                      }
                                      
                                      return displayText;
                                    })()}
                                  </div>
                                </div>
                              </div>
                              
                              {/* 匹配数量 */}
                              {group.count > 1 && (
                                <div className="flex-shrink-0">
                                  <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-xs font-medium transition-all duration-200 ${
                                    index === currentResultIndex 
                                      ? 'bg-primary/15 text-primary/80' 
                                      : 'bg-muted text-muted-foreground group-hover:bg-accent group-hover:text-accent-foreground'
                                  }`}>
                                    {group.count}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 搜索结果面板 - 桌面端 */}
          {showSearchResults && (
            <div className="hidden lg:block fixed top-10 right-0 w-80 h-[calc(100vh-2.5rem)] bg-background/95 backdrop-blur-sm border-l border-border shadow-lg z-40">
              <div className="h-full flex flex-col">
                {/* 搜索输入区域 */}
                <div className="p-3 border-b border-border">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 relative">
                      <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleSearch();
                          }
                        }}
                        placeholder="输入搜索关键词..."
                        className="w-full pl-10 pr-10 py-2 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setSearchResults([]);
                            setHasSearchResults(false);
                            setShowSearchResults(false);
                          }}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <button
                      onClick={handleSearch}
                      disabled={!searchTerm.trim()}
                      className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      搜索
                    </button>
                  </div>
                </div>

                {/* 搜索结果内容 */}
                <div className="flex-1 overflow-y-auto p-1">
                  <SearchResultsOnly
                    onPageJump={(pageNumber) => {
                      pdfViewerRef.current?.jumpToPage(pageNumber);
                    }}
                    onSectionChange={() => {}}
                    selectedPDF={currentDocument.url}
                    sharedSearchResults={searchResults}
                    sharedSearchTerm={searchTerm}
                    currentResultIndex={currentResultIndex}
                    onResultIndexChange={setCurrentResultIndex}
                    onPreviousResult={goToPreviousResult}
                    onNextResult={goToNextResult}
                    groupedResults={getGroupedResults()}
                  />
                </div>
              </div>
            </div>
          )}

        </div>
      </NoSSR>
    );
  }

  // 首页模式 - 极简设计
  return (
    <NoSSR>
      <div className="min-h-screen bg-background flex flex-col">
        {/* 极简头部 */}
        <header className="bg-background/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
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
                <h1 className="text-xl font-semibold text-foreground">PDFR</h1>
              </div>
                <ThemeToggle />
            </div>
          </div>
        </header>

        {/* 主要内容区域 */}
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-2xl w-full text-center space-y-8">
            {/* 欢迎区域 */}
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-foreground">
                简单、快速的 PDF 查看器
              </h2>
              <p className="text-lg text-muted-foreground">
                上传您的 PDF 文档，享受流畅的阅读体验
              </p>
              </div>
              
            {/* 核心功能按钮 */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                          <button
                onClick={() => setIsUploadModalOpen(true)}
                className="flex items-center space-x-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                <Upload className="h-5 w-5" />
                <span>上传文档</span>
                <ArrowRight className="h-4 w-4" />
                      </button>
              
            </div>

            {/* 快速访问我的文档 */}
            <div className="pt-8">
              <UserDocumentManager
                onDocumentSelect={handleDocumentSelect}
                showTitle={true}
                compact={true}
                refreshTrigger={refreshDocuments}
              />
            </div>
          </div>
        </main>

        {/* 极简 Footer */}
        <footer className="py-6 border-t border-border/50">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <div className="flex justify-center items-center space-x-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 relative">
                <Image 
                  src="/brand-icon.svg" 
                  alt="PDF Logo" 
                  fill
                  sizes="16px"
                  className="object-contain"
                />
              </div>
              <span>PDFR v1.0.0</span>
            </div>
          </div>
        </footer>
      </div>

      {/* 文件上传模态框 */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onFileUploaded={handleFileUploaded}
        onFileRemoved={handleFileRemoved}
      />
    </NoSSR>
  );
}