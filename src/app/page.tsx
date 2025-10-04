'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, Upload, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePDFText } from '@/contexts/PDFTextContext';
import ThemeToggle from '@/components/ThemeToggle';
import NoSSR from '@/components/NoSSR';
import UserDocumentManager from '@/components/UserDocumentManager';
import PDFViewer, { PDFViewerRef } from '@/components/PDFViewer';
import UserDocumentFloatingButton from '@/components/UserDocumentFloatingButton';
import FileUploadModal from '@/components/FileUploadModal';

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
  
  const pdfViewerRef = useRef<PDFViewerRef>(null);
  const { startLoading } = usePDFText();

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
  const handleFileUploaded = useCallback((file: any) => {
    // 文件上传成功后，触发文档列表刷新
    console.log('File uploaded:', file);
    setRefreshDocuments(prev => prev + 1);
  }, []);

  // 处理文件移除
  const handleFileRemoved = useCallback((fileId: string) => {
    // 这里可以添加文件移除后的处理逻辑
    console.log('File removed:', fileId);
  }, []);


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
              
              <Link
                href="/search"
                className="flex items-center space-x-2 px-6 py-3 border border-border text-foreground rounded-lg hover:bg-muted transition-colors font-medium"
              >
                <Search className="h-5 w-5" />
                <span>搜索文档</span>
              </Link>
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