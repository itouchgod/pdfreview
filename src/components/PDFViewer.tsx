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
  onLinkClick?: (pageNumber: number) => void;
}

export interface PDFViewerRef {
  jumpToPage: (pageNumber: number) => void;
}

const PDFViewer = forwardRef<PDFViewerRef, PDFViewerProps>(({ pdfUrl, initialPage = 1, onTextExtracted, onPageChange, onLinkClick }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingPageRef = useRef<number | null>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pdfjsLib, setPdfjsLib] = useState<any>(null);
  const [windowWidth, setWindowWidth] = useState(1024);
  const [isClient, setIsClient] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  // 初始化性能监控和缓存
  const performanceMonitor = PerformanceMonitor.getInstance();
  const cacheManager = CacheManager.getInstance();

  // 标记客户端已挂载并初始化窗口宽度
  useEffect(() => {
    setIsClient(true);
    setWindowWidth(window.innerWidth);
  }, []);

  // 处理窗口大小变化
  useEffect(() => {
    if (!isClient) return;
    
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isClient]);

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
      
      // 立即重置所有状态
      setLoading(true);
      setLoadingProgress(0);
      setError(null);
      setPdf(null);
      setTotalPages(0);

      // 设置超时机制，防止无限加载
      const timeoutId = setTimeout(() => {
        console.error('PDF loading timeout after 30 seconds');
        setError('PDF加载超时，请重试');
        setLoading(false);
      }, 30000); // 30秒超时

      try {
        // 尝试从缓存加载
        const cachedPDF = await cacheManager.get<ArrayBuffer>(`pdf:${pdfUrl}`);
        let pdfData: ArrayBuffer;

        if (cachedPDF) {
          setLoadingProgress(50);
          performanceMonitor.endMeasure('pdf_load', startTime, { cached: true });
          pdfData = cachedPDF;
        } else {
          // 从网络加载
          setLoadingProgress(20);
          const response = await fetch(pdfUrl);
          setLoadingProgress(40);
          pdfData = await response.arrayBuffer();
          setLoadingProgress(50);
          // 缓存 PDF 数据（使用长期缓存，因为PDF文件不会变化）
          await cacheManager.setPDF(`pdf:${pdfUrl}`, pdfData);
          performanceMonitor.endMeasure('pdf_load', startTime, { cached: false });
        }

        setLoadingProgress(70);
        const loadedPdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        
        setLoadingProgress(90);
        // 设置新的PDF和页数
        setPdf(loadedPdf);
        setTotalPages(loadedPdf.numPages);
        
        // 处理待处理的页面跳转
        if (pendingPageRef.current !== null) {
          const targetPage = pendingPageRef.current;
          pendingPageRef.current = null;
          setCurrentPage(targetPage);
        }
        
        setLoadingProgress(100);
        setLoading(false);
        
        console.log('PDF loaded successfully:', loadedPdf.numPages, 'pages');
        
        // 通知父组件页面变化
        onPageChange?.(currentPage, loadedPdf.numPages);
        
        // 清除超时
        clearTimeout(timeoutId);
        
      } catch (err) {
        console.error('Failed to load PDF:', err);
        setError('Failed to load PDF file');
        setPdf(null);
        setTotalPages(0);
        setCurrentPage(1);
        setLoading(false);
        performanceMonitor.endMeasure('pdf_load', startTime, { error: true });
        
        // 清除超时
        clearTimeout(timeoutId);
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
    if (pageNum < 1 || pageNum > pdf.numPages) {
      return;
    }

    // 检查是否正在渲染，如果是则直接返回
    if (isRendering) {
      return;
    }

    // 设置渲染锁
    setIsRendering(true);

    const startTime = performanceMonitor.startMeasure();

    try {
      // 彻底取消之前的渲染任务
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
          // 等待取消完成
          await new Promise(resolve => setTimeout(resolve, 50));
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

      // 清空Canvas内容，确保没有残留的渲染
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      // 等待更长时间确保之前的渲染完全停止
      await new Promise(resolve => setTimeout(resolve, 100));

      // 改进的缩放逻辑：保持PDF宽高比
      const viewport = page.getViewport({ scale: 1 });
      const containerWidth = canvas.parentElement.clientWidth || windowWidth;
      const containerHeight = canvas.parentElement.clientHeight || window.innerHeight;
      
      // 计算缩放比例：确保PDF适配容器，保持宽高比
      const scaleX = containerWidth / viewport.width;
      const scaleY = containerHeight / viewport.height;
      const scale = Math.max(0.5, Math.min(Math.min(scaleX, scaleY), 3.0));
      
      // 获取设备像素比
      const devicePixelRatio = window.devicePixelRatio || 1;
      
      // 计算视口
      const scaledViewport = page.getViewport({ scale });
      

      // 设置Canvas尺寸
      canvas.width = scaledViewport.width * devicePixelRatio;
      canvas.height = scaledViewport.height * devicePixelRatio;
      
      // 设置Canvas显示样式，保持宽高比
      canvas.style.width = scaledViewport.width + 'px';
      canvas.style.height = scaledViewport.height + 'px';
      canvas.style.display = 'block';
      canvas.style.margin = '0 auto';
      canvas.style.maxWidth = '100%';
      canvas.style.maxHeight = '100%';
      canvas.style.objectFit = 'contain';
      
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


      // 处理页面链接
      if (onLinkClick && canvasRef.current) {
        try {
          const annotations = await page.getAnnotations();
          const linkAnnotations = annotations.filter((annotation: any) => annotation.subtype === 'Link');
          
          if (linkAnnotations.length > 0) {
            
            // 创建链接层
            const linkLayer = document.createElement('div');
            linkLayer.className = 'pdf-link-layer';
            linkLayer.style.position = 'absolute';
            linkLayer.style.top = '0';
            linkLayer.style.left = '0';
            linkLayer.style.width = '100%';
            linkLayer.style.height = '100%';
            linkLayer.style.pointerEvents = 'auto';
            linkLayer.style.zIndex = '10';
            
            // 清除之前的链接层
            const existingLinkLayer = canvasRef.current.parentElement?.querySelector('.pdf-link-layer');
            if (existingLinkLayer) {
              existingLinkLayer.remove();
            }
            
            // 添加链接层到canvas的父元素
            if (canvasRef.current.parentElement) {
              canvasRef.current.parentElement.appendChild(linkLayer);
            }
            
            // 为每个链接创建可点击区域
            linkAnnotations.forEach((annotation: any, index: number) => {
              if (annotation.rect) {
                const linkElement = document.createElement('a');
                linkElement.href = '#';
                linkElement.style.position = 'absolute';
                linkElement.style.left = `${annotation.rect[0]}px`;
                linkElement.style.top = `${annotation.rect[1]}px`;
                linkElement.style.width = `${annotation.rect[2] - annotation.rect[0]}px`;
                linkElement.style.height = `${annotation.rect[3] - annotation.rect[1]}px`;
                linkElement.style.cursor = 'pointer';
                linkElement.style.backgroundColor = 'transparent';
                linkElement.style.border = '1px solid transparent';
                linkElement.title = `Link ${index + 1}`;
                
                // 处理链接点击
                linkElement.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  
                  // 解析目标页码
                  if (annotation.dest) {
                    let targetPage = null;
                    
                    if (Array.isArray(annotation.dest)) {
                      // 直接页码数组
                      if (annotation.dest[0] && typeof annotation.dest[0] === 'object' && annotation.dest[0].num) {
                        targetPage = annotation.dest[0].num;
                      } else if (typeof annotation.dest[0] === 'number') {
                        targetPage = annotation.dest[0];
                      }
                    } else if (typeof annotation.dest === 'object' && annotation.dest.num) {
                      // 目标对象
                      targetPage = annotation.dest.num;
                    }
                    
                    if (targetPage) {
                      onLinkClick(targetPage);
                    } else {
                    }
                  } else if (annotation.url) {
                    // 外部链接
                    window.open(annotation.url, '_blank');
                  } else {
                  }
                });
                
                // 添加悬停效果
                linkElement.addEventListener('mouseenter', () => {
                  linkElement.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
                  linkElement.style.border = '1px solid rgba(0, 123, 255, 0.3)';
                });
                
                linkElement.addEventListener('mouseleave', () => {
                  linkElement.style.backgroundColor = 'transparent';
                  linkElement.style.border = '1px solid transparent';
                });
                
                linkLayer.appendChild(linkElement);
              }
            });
          }
        } catch (linkError) {
          console.warn('Failed to process page links:', linkError);
        }
      }
    } catch (err: unknown) {
      // 只记录非取消错误
      if (err instanceof Error && err.name !== 'RenderingCancelledException') {
        console.error('Failed to render page:', err);
        performanceMonitor.endMeasure('page_render', startTime, { error: true });
      }
    } finally {
      // 确保渲染锁被重置
      setIsRendering(false);
    }
  }, [pdf, windowWidth, onTextExtracted, performanceMonitor, pdfUrl]);

  // 统一的页面渲染逻辑
  useEffect(() => {
    if (pdf && currentPage && !loading && canvasRef.current) {
      // 获取当前章节配置
      const pageCalculator = PageCalculator.fromPath(pdfUrl, totalPages);
      if (!pageCalculator) {
        return;
      }
      if (!pageCalculator.isValidRelativePage(currentPage)) {
        return;
      }

      // 取消之前的渲染任务
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      // 添加延迟以避免快速连续的页面变化
      const debounceTimeout = setTimeout(() => {
        renderPage(currentPage);
        onPageChange?.(currentPage, pageCalculator.getTotalPages());
      }, 100); // 恢复原来的延迟时间

      return () => {
        clearTimeout(debounceTimeout);
      };
    }
  }, [pdf, currentPage, loading, pdfUrl, totalPages]);

  // 页面跳转
  const goToPage = useCallback((page: number) => {
    const startTime = performanceMonitor.startMeasure();
    
    // 如果PDF还在加载中，先存储目标页码
    if (loading || !pdf) {
      pendingPageRef.current = page;
      performanceMonitor.endMeasure('page_navigation', startTime, { pending: true });
      return;
    }
    
    // 验证页码范围
    if (page < 1 || page > totalPages) {
      console.error('Invalid page number:', page, 'totalPages:', totalPages);
      performanceMonitor.endMeasure('page_navigation', startTime, { error: true });
      return;
    }
    
    // 如果页码没有变化，不需要重新渲染
    if (page === currentPage) {
      performanceMonitor.endMeasure('page_navigation', startTime, { noChange: true });
      return;
    }
    
    setCurrentPage(page);
    onPageChange?.(page, totalPages);
    performanceMonitor.endMeasure('page_navigation', startTime, { success: true });
  }, [loading, pdf, onPageChange, performanceMonitor, totalPages, currentPage]);

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
      }, 300); // 恢复原来的防抖时间
    }
  }, [windowWidth, pdf, currentPage, renderPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-background">
        <div className="text-center w-full max-w-sm">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground mb-3">正在加载文档...</p>
          
          {/* 进度条 */}
          <div className="w-full bg-muted/30 rounded-full h-2 mb-3">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          
          <p className="text-xs text-muted-foreground/70">
            {loadingProgress < 50 ? '下载中...' : 
             loadingProgress < 90 ? '解析中...' : 
             '渲染中...'}
          </p>
          <p className="text-xs text-muted-foreground/50 mt-1">
            大文件可能需要几秒钟，请耐心等待
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-background">
        <div className="text-center">
          <FileText className="h-8 w-8 text-destructive mx-auto mb-4" />
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              setLoadingProgress(0);
              // 重新触发加载
              if (pdfjsLib && pdfUrl) {
                const loadPDF = async () => {
                  try {
                    const response = await fetch(pdfUrl);
                    const pdfData = await response.arrayBuffer();
                    const loadedPdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
                    setPdf(loadedPdf);
                    setTotalPages(loadedPdf.numPages);
                    setLoading(false);
                    onPageChange?.(currentPage, loadedPdf.numPages);
                  } catch (err) {
                    console.error('Retry failed:', err);
                    setError('重试失败，请检查文件是否有效');
                    setLoading(false);
                  }
                };
                loadPDF();
              }
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center" style={{ margin: 0, padding: 0, overflow: 'auto' }}>
      <canvas 
        ref={canvasRef} 
        className="block"
        style={{ 
          display: 'block',
          margin: '0 auto',
          padding: 0,
          outline: 'none',
          verticalAlign: 'top',
          backgroundColor: '#ffffff',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain'
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