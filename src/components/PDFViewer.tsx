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
      const startTime = performanceMonitor.startMeasure();
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

      const startTime = performanceMonitor.startMeasure();
      
      // 获取当前章节配置
      const pageCalculator = PageCalculator.fromPath(pdfUrl);
      if (!pageCalculator) {
        setError('Invalid PDF section');
        return;
      }
      
      // 立即重置所有状态
      setLoading(true);
      setError(null);
      setPdf(null);
      setTotalPages(pageCalculator.getTotalPages());

      try {
        // 尝试从缓存加载
        const cachedPDF = await cacheManager.get<ArrayBuffer>(`pdf:${pdfUrl}`);
        let pdfData: ArrayBuffer;

        if (cachedPDF) {
          performanceMonitor.endMeasure('pdf_load', startTime, { cached: true });
          pdfData = cachedPDF;
        } else {
          // 从网络加载
          const response = await fetch(pdfUrl);
          pdfData = await response.arrayBuffer();
          // 缓存 PDF 数据（使用长期缓存，因为PDF文件不会变化）
          await cacheManager.setPDF(`pdf:${pdfUrl}`, pdfData);
          performanceMonitor.endMeasure('pdf_load', startTime, { cached: false });
        }

        const loadedPdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        
        // 设置新的PDF和页数
        setPdf(loadedPdf);
        setTotalPages(loadedPdf.numPages);
        
        // 处理待处理的页面跳转
        if (pendingPageRef.current !== null) {
          const targetPage = pendingPageRef.current;
          pendingPageRef.current = null;
          setCurrentPage(targetPage);
        }
        
        setLoading(false);
        
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
  }, [pdfjsLib, pdfUrl, cacheManager, performanceMonitor]);

  // 渲染页面
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdf || !canvasRef.current) {
      return;
    }

    // 验证页码是否有效
    const pageCalculator = PageCalculator.fromPath(pdfUrl);
    if (!pageCalculator) {
      return;
    }
    if (!pageCalculator.isValidRelativePage(pageNum)) {
      return;
    }

    const startTime = performanceMonitor.startMeasure();

    try {
      // 彻底取消之前的渲染任务
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // 忽略取消时的错误
        }
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

      // 等待一小段时间确保之前的渲染完全停止
      await new Promise(resolve => setTimeout(resolve, 10));

      // 简化的缩放逻辑：只计算一次缩放比例
      const viewport = page.getViewport({ scale: 1 });
      const containerWidth = canvas.parentElement.clientWidth || windowWidth;
      
      // 计算缩放比例：确保PDF宽度适配容器宽度
      const scale = Math.max(0.5, Math.min(containerWidth / viewport.width, 3.0));
      
      // 获取设备像素比
      const devicePixelRatio = window.devicePixelRatio || 1;
      
      // 计算视口
      const scaledViewport = page.getViewport({ scale });
      

      // 设置Canvas尺寸
      canvas.width = scaledViewport.width * devicePixelRatio;
      canvas.height = scaledViewport.height * devicePixelRatio;
      
      // 设置Canvas显示样式
      canvas.style.width = scaledViewport.width + 'px';
      canvas.style.height = scaledViewport.height + 'px';
      canvas.style.display = 'block';
      canvas.style.margin = '0 auto';
      
      // 设置高DPI缩放
      context.scale(devicePixelRatio, devicePixelRatio);
      
      // 优化渲染质量
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';

      // 创建新的渲染任务
      const currentRenderTask = page.render({
        canvasContext: context,
        viewport: scaledViewport
      });

      // 保存当前渲染任务引用
      renderTaskRef.current = currentRenderTask;

      // 等待渲染完成
      try {
        await currentRenderTask.promise;
        // 只有在当前任务仍然是活跃任务时才清理
        if (renderTaskRef.current === currentRenderTask) {
          renderTaskRef.current = null;
        }
      } catch (error: any) {
        // 清理引用
        if (renderTaskRef.current === currentRenderTask) {
          renderTaskRef.current = null;
        }
        
        // 只有在不是取消错误的情况下才抛出
        if (error?.name !== 'RenderingCancelledException') {
          throw error;
        }
        // 对于取消错误，静默处理
      }
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
        return;
      }
      if (!pageCalculator.isValidRelativePage(currentPage)) {
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
    const startTime = performanceMonitor.startMeasure();
    
    // 如果PDF还在加载中，先存储目标页码
    if (loading || !pdf) {
      pendingPageRef.current = page;
      performanceMonitor.endMeasure('page_navigation', startTime, { pending: true });
      return;
    }
    
    // 获取当前章节配置并验证页码
    const pageCalculator = PageCalculator.fromPath(pdfUrl);
    if (pageCalculator) {
      const validPage = pageCalculator.getValidRelativePage(page);
      if (validPage !== page) {
        // 静默处理页码调整，避免控制台噪音
        // 页码会自动调整到有效范围内
        page = validPage;
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

  // 窗口大小变化时重新渲染（仅在必要时）
  useEffect(() => {
    if (pdf && currentPage) {
      // 取消之前的超时
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
      
      // 防抖处理，避免频繁重新渲染
      renderTimeoutRef.current = setTimeout(() => {
        // 检查是否需要重新渲染
        const canvas = canvasRef.current;
        if (canvas && canvas.parentElement) {
          const containerWidth = canvas.parentElement.clientWidth;
          const currentCanvasWidth = canvas.width;
          
          // 只有当宽度差异超过 20px 时才重新渲染
          if (Math.abs(currentCanvasWidth - containerWidth) > 20) {
            renderPage(currentPage);
          }
        }
      }, 300); // 增加防抖时间
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
    <div className="relative w-full" style={{ margin: 0, padding: 0, textAlign: 'center' }}>
      <canvas 
        ref={canvasRef} 
        className="block"
        style={{ 
          display: 'block',
          margin: '0 auto',
          padding: 0,
          border: 'none',
          outline: 'none',
          verticalAlign: 'top'
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