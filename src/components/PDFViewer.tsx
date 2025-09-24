'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { FileText, Loader2 } from 'lucide-react';

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
  const [pdf, setPdf] = useState<unknown>(null);
  const [currentPage, setCurrentPage] = useState(initialPage); // 使用传入的初始页面
  
  // 当initialPage变化时，更新currentPage
  const lastInitialPageRef = useRef(initialPage);
  useEffect(() => {
    if (initialPage && initialPage !== lastInitialPageRef.current) {
      lastInitialPageRef.current = initialPage;
      setCurrentPage(initialPage);
    }
  }, [initialPage]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfjsLib, setPdfjsLib] = useState<any>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  // Handle window resize for responsive PDF scaling
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Dynamically load PDF.js
  useEffect(() => {
    const loadPdfjs = async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        
        // Add global error handling
        window.addEventListener('unhandledrejection', (event) => {
          if (event.reason && event.reason.message && 
              event.reason.message.includes('message channel closed')) {
            console.warn('Browser extension communication error, ignored:', event.reason.message);
            event.preventDefault(); // Prevent error display
          }
        });
        
        setPdfjsLib(pdfjs);
      } catch (err) {
        setError('Failed to load PDF.js: ' + (err as Error).message);
        setLoading(false);
      }
    };
    
    loadPdfjs();
  }, []);

  const extractAllText = useCallback(async (pdfDoc: any) => {
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += `\n--- 第 ${pageNum} 页 ---\n${pageText}\n`;
      } catch (err) {
        console.error(`提取第 ${pageNum} 页文本失败:`, err);
      }
    }
    
    onTextExtracted?.(fullText);
  }, [onTextExtracted]);

  const renderPageWithPDF = useCallback(async (pdfDoc: any, pageNum: number) => {
    if (!pdfDoc || !pdfjsLib) return;
    
    // Validate page number using actual PDF document pages
    if (pageNum < 1 || pageNum > pdfDoc.numPages) {
      console.log('Invalid page number:', { pageNum, totalPages: pdfDoc.numPages });
      return;
    }
    
    try {
      // Cancel previous render task and wait for it to complete
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // Ignore cancellation errors
        }
        renderTaskRef.current = null;
      }
      
      // Wait a bit to ensure previous task is fully cancelled
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const page = await pdfDoc.getPage(pageNum);
      // Calculate scale to fit container width with better mobile support
      const containerWidth = canvasRef.current?.parentElement?.clientWidth || 
                           canvasRef.current?.parentElement?.parentElement?.clientWidth || 
                           800;
      const viewport = page.getViewport({ scale: 1.0 });
      
      // Get device pixel ratio for high-DPI displays
      const devicePixelRatio = window.devicePixelRatio || 1;
      
      // Calculate base scale to fit container width while maintaining aspect ratio
      let scale = containerWidth / viewport.width;
      
      // Apply reasonable scaling limits to prevent distortion
      const isMobile = windowWidth < 768;
      if (isMobile) {
        scale = Math.min(scale * 1.2, 2.5); // Moderate scale for mobile
      } else {
        // For desktop, use moderate scaling to maintain readability
        scale = Math.min(scale * 1.3, 3.0); // Moderate scale for desktop
      }
      
      const scaledViewport = page.getViewport({ scale });
      
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        if (!context) return;
        
        // Clear canvas completely
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set new dimensions based on scaled viewport with high-DPI support
        const displayWidth = scaledViewport.width;
        const displayHeight = scaledViewport.height;
        
        // Set the actual canvas size in device pixels (for high-DPI)
        canvas.width = displayWidth * devicePixelRatio;
        canvas.height = displayHeight * devicePixelRatio;
        
        // Set the CSS size in logical pixels
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
        
        // Scale the drawing context to match device pixel ratio
        context.scale(devicePixelRatio, devicePixelRatio);
        
        // Clear canvas
        context.clearRect(0, 0, displayWidth, displayHeight);
        
        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport,
        };
        
        // Create new render task and save reference
        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        
        await renderTask.promise;
        renderTaskRef.current = null;
        
        // Highlight functionality removed
      }
    } catch (err: any) {
      // 忽略渲染取消异常，这是正常的
      if (err.name !== 'RenderingCancelledException') {
        console.error('渲染页面失败:', err);
      }
    }
  }, [pdfjsLib, totalPages]);

  const loadPDF = useCallback(async () => {
    if (!pdfjsLib) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Cancel previous render task
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // 忽略取消渲染时的错误
        }
        renderTaskRef.current = null;
      }
      
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdfDoc = await loadingTask.promise;
      
      setPdf(pdfDoc);
      setTotalPages(pdfDoc.numPages);
      // Don't reset currentPage to avoid jumping to first page when switching sections
      
      // Extract text from all pages
      await extractAllText(pdfDoc);
      
    } catch (err) {
      setError('Failed to load PDF: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [pdfjsLib, pdfUrl, extractAllText]);

  useEffect(() => {
    if (pdfjsLib && pdfUrl) {
      // Reset state but don't reset currentPage to avoid jumping to first page
      setPdf(null);
      setTotalPages(0);
      setError(null);
      setLoading(true);
      loadPDF();
    }
  }, [pdfjsLib, pdfUrl, loadPDF]);

  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdf || !pdfjsLib) return;
    
    // Clear any pending render timeout
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }
    
    // Debounce rendering to avoid rapid successive calls
    renderTimeoutRef.current = setTimeout(async () => {
      await renderPageWithPDF(pdf, pageNum);
    }, 50);
  }, [pdf, pdfjsLib, renderPageWithPDF]);


  // Highlight functionality removed

  useEffect(() => {
    if (pdf && currentPage && !loading) {
      renderPage(currentPage);
      // 通知父组件页面变化
      onPageChange?.(currentPage, totalPages);
    }
  }, [pdf, currentPage, loading, renderPage, onPageChange, totalPages]);

  // Highlight functionality removed

  // Handle window resize to recalculate PDF scale
  useEffect(() => {
    const handleResize = () => {
      if (pdf && currentPage && !loading) {
        // Debounce resize events
        if (renderTimeoutRef.current) {
          clearTimeout(renderTimeoutRef.current);
        }
        renderTimeoutRef.current = setTimeout(() => {
          renderPage(currentPage);
        }, 250);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      // Clear timeout
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
        renderTimeoutRef.current = null;
      }
      
      // Cancel render task
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // Ignore cancellation errors during cleanup
        }
        renderTaskRef.current = null;
      }
    };
  }, [pdf, currentPage, loading, renderPage]);


  const goToPage = (page: number) => {
    console.log('PDFViewer goToPage called:', { page, totalPages, isValid: page >= 1 && page <= totalPages });
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      onPageChange?.(page, totalPages);
    } else {
      console.log('Invalid page number:', { page, totalPages });
    }
  };

  // Methods exposed to parent component
  useImperativeHandle(ref, () => ({
    jumpToPage: (pageNumber: number) => {
      goToPage(pageNumber);
    }
  }));

  // Re-render PDF when window width changes
  useEffect(() => {
    if (pdf && currentPage) {
      renderPage(currentPage);
    }
  }, [windowWidth, pdf, currentPage, renderPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading IMPA data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg">
        <div className="text-center">
          <FileText className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-auto flex justify-center">
      <canvas 
        ref={canvasRef} 
        className="h-auto"
        style={{ 
          imageRendering: 'crisp-edges',
          maxWidth: '100%',
          height: 'auto',
          display: 'block'
        } as React.CSSProperties}
      />
    </div>
  );
});

PDFViewer.displayName = 'PDFViewer';

export default PDFViewer;