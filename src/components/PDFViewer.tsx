'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { PageCalculator } from '@/utils/pageCalculator';
import { PDFErrorBoundary } from './PDFErrorBoundary';
import { CacheManager } from '@/lib/cache';
import { PerformanceMonitor } from '@/lib/performance';

interface PDFViewerProps {
  pdfUrl: string;
  initialPage?: number;
  onTextExtracted?: (text: string) => void;
  onPageChange?: (currentPage: number, totalPages: number) => void;
}

export interface PDFViewerRef {
  jumpToPage: (pageNumber: number) => void;
}

const PDFViewer = forwardRef<PDFViewerRef, PDFViewerProps>(({ pdfUrl, initialPage = 1, onTextExtracted, onPageChange }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingPageRef = useRef<number | null>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfjsLib, setPdfjsLib] = useState<any>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  // 初始化性能监控和缓存
  const performanceMonitor = PerformanceMonitor.getInstance();
  const cacheManager = CacheManager.getInstance();

  // 处理窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 动态加载 PDF.js
  useEffect(() => {
    const loadPDFJS = async () => {
      const startTime = performanceMonitor.startMeasure('pdfjs_load');
      try {
        const { getPDFJS } = await import('@/lib/pdfjs-config');
        const pdfjs = await getPDFJS();
        setPdfjsLib(pdfjs);
        performanceMonitor.endMeasure('pdfjs_load', startTime);
      } catch (err) {
        console.error('Failed to load PDF.js:', err);
        setError('Failed to load PDF viewer');
        performanceMonitor.endMeasure('pdfjs_load', startTime, { error: true });
      }
    };

    loadPDFJS();
  }, [performanceMonitor]);

  // 加载 PDF 文件
  useEffect(() => {
    const loadPDF = async () => {
      if (!pdfjsLib || !pdfUrl) return;

      const startTime = performanceMonitor.startMeasure('pdf_load');
      
      // 获取当前章节配置
      const pageCalculator = PageCalculator.fromPath(pdfUrl);
      if (!pageCalculator) {
        console.log('Section not found:', pdfUrl);
        setError('Invalid PDF section');
        return;
      }
      
      // 立即重置所有状态
      setLoading(true);
      setError(null);
      setPdf(null);
      setTotalPages(pageCalculator.getTotalPages());

      try {
        console.log('Starting to load PDF:', pdfUrl);
        
        // 尝试从缓存加载
        const cachedPDF = await cacheManager.get<ArrayBuffer>(`pdf:${pdfUrl}`);
        let pdfData: ArrayBuffer;

        if (cachedPDF) {
          console.log('Using cached PDF data');
          performanceMonitor.endMeasure('pdf_load', startTime, { cached: true });
          pdfData = cachedPDF;
        } else {
          console.log('Fetching PDF from network');
          // 从网络加载
          const response = await fetch(pdfUrl);
          pdfData = await response.arrayBuffer();
          // 缓存 PDF 数据
          await cacheManager.set(`pdf:${pdfUrl}`, pdfData);
          performanceMonitor.endMeasure('pdf_load', startTime, { cached: false });
        }

        console.log('Loading PDF document');
        const loadedPdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        console.log('PDF loaded successfully:', { numPages: loadedPdf.numPages });
        
        // 设置新的PDF和页数
        setPdf(loadedPdf);
        setTotalPages(loadedPdf.numPages);
        
      // 处理待处理的页面跳转
      if (pendingPageRef.current !== null) {
        const targetPage = pendingPageRef.current;
        pendingPageRef.current = null;
        console.log('Jumping to pending page:', targetPage);
        setCurrentPage(targetPage);
      }
        
        // 确保在设置loading=false之前所有状态都已更新
        await new Promise(resolve => setTimeout(resolve, 100));
        setLoading(false);
        console.log('PDF loading completed');
        
      } catch (err) {
        console.error('Failed to load PDF:', err);
        setError('Failed to load PDF file');
        setPdf(null);
        setTotalPages(0);
        setCurrentPage(1);
        setLoading(false);
        performanceMonitor.endMeasure('pdf_load', startTime, { error: true });
      }
    };

    loadPDF();
  }, [pdfjsLib, pdfUrl, cacheManager, performanceMonitor, currentPage, initialPage]);

  // 渲染页面
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdf || !canvasRef.current) {
      console.log('Skipping render - PDF or canvas not ready');
      return;
    }

    // 验证页码是否有效
    const pageCalculator = PageCalculator.fromPath(pdfUrl);
    if (!pageCalculator) {
      console.log('Section not found:', pdfUrl);
      return;
    }
    if (!pageCalculator.isValidRelativePage(pageNum)) {
      console.log('Invalid page number:', { pageNum, totalPages: pdf.numPages });
      return;
    }

    const startTime = performanceMonitor.startMeasure('page_render');

    try {
      // 取消之前的渲染任务
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      // 取消之前的超时
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
        renderTimeoutRef.current = null;
      }

      // 确保PDF对象和页码都有效
      if (!pdf.getPage) {
        throw new Error('PDF object is not properly initialized');
      }

      const page = await pdf.getPage(pageNum);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context || !canvas.parentElement) {
        throw new Error('Canvas context or parent element not available');
      }

      // 计算缩放比例 - 针对手机端优化清晰度
      const viewport = page.getViewport({ scale: 1 });
      const containerWidth = canvas.parentElement.clientWidth || windowWidth;
      
      // 基础缩放比例
      let scale = containerWidth / viewport.width;
      
      // 手机端优化：提高缩放比例以获得更清晰的显示
      const isMobile = windowWidth < 768;
      const isHighDPI = window.devicePixelRatio > 1;
      
      if (isMobile) {
        // 手机端使用更高的缩放比例
        scale *= isHighDPI ? 1.5 : 2.0;
      } else if (isHighDPI) {
        // 桌面端高DPI屏幕也适当提高缩放
        scale *= 1.2;
      }
      
      // 限制最大缩放比例，避免性能问题
      scale = Math.min(scale, 3.0);
      
      const scaledViewport = page.getViewport({ scale });

      canvas.height = scaledViewport.height;
      canvas.width = scaledViewport.width;
      
      // 优化Canvas渲染质量
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      
      // 设置高DPI支持
      const devicePixelRatio = window.devicePixelRatio || 1;
      if (devicePixelRatio > 1) {
        canvas.width = scaledViewport.width * devicePixelRatio;
        canvas.height = scaledViewport.height * devicePixelRatio;
        canvas.style.width = scaledViewport.width + 'px';
        canvas.style.height = scaledViewport.height + 'px';
        context.scale(devicePixelRatio, devicePixelRatio);
      }

      // 使用 Promise.race 添加超时
      const renderPromise = new Promise((resolve, reject) => {
        try {
          renderTaskRef.current = page.render({
            canvasContext: context,
            viewport: scaledViewport
          });

          renderTaskRef.current.promise
            .then(resolve)
            .catch((error: Error) => {
              // 只有在不是取消错误的情况下才拒绝
              if (error?.name !== 'RenderingCancelledException') {
                reject(error);
              } else {
                // 对于取消错误，我们静默处理
                resolve(null);
              }
            });
        } catch (error) {
          reject(error);
        }
      });

      // 等待渲染完成
      await renderPromise;
      performanceMonitor.endMeasure('page_render', startTime);

      // 只有在渲染成功且组件仍然挂载时才提取文本
      if (onTextExtracted && canvasRef.current) {
        const textContent = await page.getTextContent();
        const text = textContent.items.map((item: any) => item.str).join(' ');
        onTextExtracted(text);
      }
    } catch (err: unknown) {
      // 只记录非取消错误
      if (err instanceof Error && err.name !== 'RenderingCancelledException') {
        console.error('Failed to render page:', err);
        performanceMonitor.endMeasure('page_render', startTime, { error: true });
      }
    }
  }, [pdf, windowWidth, onTextExtracted, performanceMonitor, pdfUrl]);

  // 监听页面变化
  useEffect(() => {
    if (pdf && currentPage && !loading) {
      // 获取当前章节配置
      const pageCalculator = PageCalculator.fromPath(pdfUrl);
      if (!pageCalculator) {
        console.log('Section not found:', pdfUrl);
        return;
      }
      if (!pageCalculator.isValidRelativePage(currentPage)) {
        console.log('Invalid page number:', { currentPage, totalPages });
        return;
      }

      // 添加延迟以避免快速连续的页面变化
      const debounceTimeout = setTimeout(() => {
        renderPage(currentPage);
        onPageChange?.(currentPage, pageCalculator.getTotalPages());
      }, 100); // 100ms 延迟

      return () => {
        clearTimeout(debounceTimeout);
        // 取消当前渲染任务
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }
      };
    }
  }, [pdf, currentPage, loading, renderPage, onPageChange, pdfUrl, totalPages]);

  // 页面跳转
  const goToPage = useCallback((page: number) => {
    const startTime = performanceMonitor.startMeasure('page_navigation');
    
    // 如果PDF还在加载中，先存储目标页码
    if (loading || !pdf) {
      pendingPageRef.current = page;
      performanceMonitor.endMeasure('page_navigation', startTime, { pending: true });
      return;
    }
    
    // 获取当前章节配置（仅在开发环境下验证页码）
    if (process.env.NODE_ENV === 'development') {
      const pageCalculator = PageCalculator.fromPath(pdfUrl);
      if (pageCalculator) {
        const currentTotalPages = pageCalculator.getTotalPages();
        const validPage = pageCalculator.getValidRelativePage(page);
        if (validPage !== page) {
          console.warn('Invalid page number adjusted:', { 
            requested: page,
            adjusted: validPage,
            totalPages: currentTotalPages
          });
          page = validPage;
        }
      }
    }
    
    setCurrentPage(page);
    onPageChange?.(page, totalPages);
    performanceMonitor.endMeasure('page_navigation', startTime, { success: true });
  }, [loading, pdf, onPageChange, performanceMonitor, pdfUrl, totalPages]);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    jumpToPage: goToPage
  }), [goToPage]);

  // 窗口大小变化时重新渲染
  useEffect(() => {
    if (pdf && currentPage) {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
      renderTimeoutRef.current = setTimeout(() => {
        renderPage(currentPage);
      }, 100);
    }
  }, [windowWidth, pdf, currentPage, renderPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted rounded-lg">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading IMPA data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-destructive/10 rounded-lg">
        <div className="text-center">
          <FileText className="h-8 w-8 text-destructive mx-auto mb-4" />
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <canvas 
        ref={canvasRef} 
        className="h-auto shadow-lg"
        style={{ 
          imageRendering: 'auto',
          maxWidth: '100%',
          height: 'auto',
          display: 'block',
          objectFit: 'contain',
          // 优化手机端显示
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
          WebkitTransform: 'translateZ(0)',
          transform: 'translateZ(0)'
        } as React.CSSProperties}
      />
    </div>
  );
});

PDFViewer.displayName = 'PDFViewer';

const PDFViewerWithErrorBoundary = forwardRef<PDFViewerRef, PDFViewerProps>((props, ref) => {
  return (
    <PDFErrorBoundary>
      <PDFViewer {...props} ref={ref} />
    </PDFErrorBoundary>
  );
});

PDFViewerWithErrorBoundary.displayName = 'PDFViewerWithErrorBoundary';

export default PDFViewerWithErrorBoundary;