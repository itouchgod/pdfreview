import type * as PDFJS from 'pdfjs-dist';

let pdfjsLib: typeof PDFJS | null = null;

export async function getPDFJS(): Promise<typeof PDFJS> {
  if (pdfjsLib) {
    return pdfjsLib;
  }

  try {
    // 使用动态导入加载 PDF.js
    const pdfjs = await import('pdfjs-dist/webpack') as typeof PDFJS;
    
    // 配置 worker
    if (typeof window !== 'undefined') {
      // 使用动态导入加载 worker
      const { default: workerSrc } = await import('pdfjs-dist/build/pdf.worker.entry');
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
      
      // 优化渲染配置
      // verbosity 属性在新版本中已移除
      
      // 设置更好的渲染质量
      // isEvalSupported 属性在新版本中已移除
    }

    pdfjsLib = pdfjs;
    return pdfjsLib;
  } catch (error) {
    console.error('Failed to load PDF.js:', error);
    throw error;
  }
}