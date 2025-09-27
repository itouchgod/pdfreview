import type { PDFJSStatic } from 'pdfjs-dist';

let pdfjsLib: PDFJSStatic | null = null;

export async function getPDFJS(): Promise<PDFJSStatic> {
  if (pdfjsLib) {
    return pdfjsLib;
  }

  try {
    // 使用动态导入加载 PDF.js
    const pdfjs = await import('pdfjs-dist/webpack');
    
    // 配置 worker
    if (typeof window !== 'undefined') {
      // 使用动态导入加载 worker
      const worker = await import('pdfjs-dist/build/pdf.worker.entry');
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    }

    pdfjsLib = pdfjs as unknown as PDFJSStatic;
    return pdfjsLib;
  } catch (error) {
    console.error('Failed to load PDF.js:', error);
    throw error;
  }
}