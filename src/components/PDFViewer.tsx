'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { FileText, Loader2 } from 'lucide-react';

interface PDFViewerProps {
  pdfUrl: string;
  onTextExtracted?: (text: string) => void;
}

export interface PDFViewerRef {
  jumpToPage: (pageNumber: number) => void;
}

const PDFViewer = forwardRef<PDFViewerRef, PDFViewerProps>(({ pdfUrl, onTextExtracted }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [pdf, setPdf] = useState<unknown>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfjsLib, setPdfjsLib] = useState<any>(null);

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

  const loadPDF = useCallback(async () => {
    if (!pdfjsLib) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Cancel previous render task
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdfDoc = await loadingTask.promise;
      
      setPdf(pdfDoc);
      setTotalPages(pdfDoc.numPages);
      setCurrentPage(1); // Reset to first page
      
      // Extract text from all pages
      await extractAllText(pdfDoc);
      
    } catch (err) {
      setError('Failed to load PDF: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [pdfjsLib, pdfUrl]);

  useEffect(() => {
    if (pdfjsLib && pdfUrl) {
      // Reset state
      setPdf(null);
      setCurrentPage(1);
      setTotalPages(0);
      loadPDF();
    }
  }, [pdfjsLib, pdfUrl, loadPDF]);

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
  }, [pdf, pdfjsLib]);

  const renderPageWithPDF = useCallback(async (pdfDoc: any, pageNum: number) => {
    if (!pdfDoc || !pdfjsLib) return;
    
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
      // Calculate scale to fit container width
      const containerWidth = canvasRef.current?.parentElement?.clientWidth || 800;
      const viewport = page.getViewport({ scale: 1.0 });
      const scale = Math.min(containerWidth / viewport.width, 2.0); // Max scale of 2.0
      const scaledViewport = page.getViewport({ scale });
      
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        if (!context) return;
        
        // Clear canvas completely
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set new dimensions based on scaled viewport
        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;
        
        // Clear again after resizing
        context.clearRect(0, 0, canvas.width, canvas.height);
        
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
      if (err.name !== 'RenderingCancelledException') {
        console.error('Failed to render page:', err);
      }
    }
  }, [pdfjsLib]);

  // Highlight functionality removed

  useEffect(() => {
    if (pdf && currentPage && !loading) {
      renderPage(currentPage);
    }
  }, [pdf, currentPage, loading, renderPage]);

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
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Methods exposed to parent component
  useImperativeHandle(ref, () => ({
    jumpToPage: (pageNumber: number) => {
      goToPage(pageNumber);
    }
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading PDF...</p>
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
    <div className="space-y-4">
      {/* Page Controls */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Next
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <input
            type="number"
            min="1"
            max={totalPages}
            value={currentPage}
            onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
            className="w-20 px-2 py-1 border rounded text-center"
          />
          <span className="text-sm text-gray-500">Go to</span>
        </div>
      </div>

      {/* PDF Canvas */}
      <div className="bg-white rounded-lg shadow overflow-auto">
        <canvas ref={canvasRef} className="w-full h-auto" />
      </div>
    </div>
  );
});

PDFViewer.displayName = 'PDFViewer';

export default PDFViewer;