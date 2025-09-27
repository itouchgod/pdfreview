import type { PDFJSStatic } from 'pdfjs-dist';

let pdfjsLib: PDFJSStatic | null = null;

export async function getPDFJS(): Promise<PDFJSStatic> {
  if (pdfjsLib) {
    return pdfjsLib;
  }

  try {
    // Use require to load the CommonJS build
    const pdfjs = require('pdfjs-dist/webpack');
    
    // Configure the worker
    if (typeof window !== 'undefined') {
      // Use the bundled worker
      const worker = require('pdfjs-dist/build/pdf.worker.entry');
      pdfjs.GlobalWorkerOptions.workerSrc = worker;
    }

    pdfjsLib = pdfjs;
    return pdfjs;
  } catch (error) {
    console.error('Failed to load PDF.js:', error);
    throw error;
  }
}
