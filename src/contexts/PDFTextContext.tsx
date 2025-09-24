'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { PDF_CONFIG } from '@/config/pdf';

export interface PDFTextData {
  [filePath: string]: string;
}

export interface LoadingStatus {
  isLoading: boolean;
  loadedSections: number;
  totalSections: number;
  progress: number;
}

interface PDFTextContextType {
  textData: PDFTextData;
  loadingStatus: LoadingStatus;
  isReady: boolean;
  startLoading: () => void;
  hasStartedLoading: boolean;
}

const PDFTextContext = createContext<PDFTextContextType | undefined>(undefined);

export function PDFTextProvider({ children }: { children: ReactNode }) {
  const [textData, setTextData] = useState<PDFTextData>({});
  const [loadingStatus, setLoadingStatus] = useState<LoadingStatus>({
    isLoading: false,
    loadedSections: 0,
    totalSections: PDF_CONFIG.sections.length,
    progress: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasStartedLoading, setHasStartedLoading] = useState(false);

  const startLoading = useCallback(async () => {
    if (isLoading || hasLoaded || hasStartedLoading) {
      return; // 已经在加载或已经加载过或已经开始过
    }
    
    setHasStartedLoading(true);

    setIsLoading(true);
    setLoadingStatus({
      isLoading: true,
      loadedSections: 0,
      totalSections: PDF_CONFIG.sections.length,
      progress: 0
    });

    const sectionsText: PDFTextData = {};
    
    // Dynamically import PDF.js
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    
    for (const section of PDF_CONFIG.sections) {
      try {
        const response = await fetch(section.filePath);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const pdf = await (pdfjsLib as any).getDocument(arrayBuffer).promise;
          
          let fullText = '';
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            try {
              const page = await pdf.getPage(pageNum);
              const textContent = await page.getTextContent();
              const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');
              const actualPageNum = section.startPage + pageNum - 1;
              fullText += `\n--- 第 ${actualPageNum} 页 ---\n${pageText}\n`;
            } catch (err) {
              console.error(`提取章节 ${section.name} 第 ${pageNum} 页文本失败:`, err);
            }
          }
          
          sectionsText[section.filePath] = fullText;
          
          // 更新加载状态
          const loadedCount = Object.keys(sectionsText).length;
          const progress = (loadedCount / PDF_CONFIG.sections.length) * 100;
          
          setLoadingStatus({
            isLoading: loadedCount < PDF_CONFIG.sections.length,
            loadedSections: loadedCount,
            totalSections: PDF_CONFIG.sections.length,
            progress
          });
        }
      } catch (error) {
        console.warn(`Failed to load section ${section.name}:`, error);
      }
    }
    
    setTextData(sectionsText);
    setIsLoading(false);
    setHasLoaded(true);
  }, [isLoading, hasLoaded, hasStartedLoading]); // 包含所有使用的状态变量

  const isReady = !loadingStatus.isLoading && loadingStatus.loadedSections > 0;

  return (
    <PDFTextContext.Provider value={{
      textData,
      loadingStatus,
      isReady,
      startLoading,
      hasStartedLoading
    }}>
      {children}
    </PDFTextContext.Provider>
  );
}

export function usePDFText() {
  const context = useContext(PDFTextContext);
  if (context === undefined) {
    throw new Error('usePDFText must be used within a PDFTextProvider');
  }
  return context;
}
