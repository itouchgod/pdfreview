// 使用 * as 导入所有类型
import type * as PDFJS from 'pdfjs-dist';

let pdfjsLib: typeof PDFJS | null = null;

export async function getPDFJS(): Promise<typeof PDFJS> {
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

    pdfjsLib = pdfjs;
    return pdfjsLib;
  } catch (error) {
    console.error('Failed to load PDF.js:', error);
    throw error;
  }
}