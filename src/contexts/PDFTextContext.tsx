'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { PDF_CONFIG } from '@/config/pdf';

export interface PDFTextData {
  [filePath: string]: string;
}

export interface LoadingStatus {
  isLoading: boolean;
  loadedSections: number;
  totalSections: number;
  progress: number;
  error?: string;
  currentSection?: string;
}

interface CachedData {
  textData: PDFTextData;
  timestamp: number;
  version: string;
}

interface PDFTextContextType {
  textData: PDFTextData;
  loadingStatus: LoadingStatus;
  isReady: boolean;
  startLoading: () => void;
  hasStartedLoading: boolean;
  clearCache: () => void;
}

const PDFTextContext = createContext<PDFTextContextType | undefined>(undefined);

// 缓存配置
const CACHE_KEY = 'impa_pdf_text_cache';
const CACHE_VERSION = '1.0.0';
const CACHE_EXPIRY_DAYS = 7; // 缓存7天

// 缓存工具函数
const getCachedData = (): CachedData | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const data: CachedData = JSON.parse(cached);
    
    // 检查版本和过期时间
    const now = Date.now();
    const expiryTime = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000; // 转换为毫秒
    
    if (data.version !== CACHE_VERSION || (now - data.timestamp) > expiryTime) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return data;
  } catch (error) {
    console.warn('Failed to parse cached PDF data:', error);
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
};

const setCachedData = (textData: PDFTextData): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const data: CachedData = {
      textData,
      timestamp: Date.now(),
      version: CACHE_VERSION
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to cache PDF data:', error);
  }
};

const clearCachedData = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CACHE_KEY);
};

// 添加重试逻辑
const fetchWithRetry = async (url: string, retries = 3): Promise<Response> => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i))); // 指数退避
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries`);
};

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

  // 初始化时检查缓存
  useEffect(() => {
    const cachedData = getCachedData();
    if (cachedData && Object.keys(cachedData.textData).length > 0) {
      setTextData(cachedData.textData);
      setHasLoaded(true);
      setLoadingStatus({
        isLoading: false,
        loadedSections: PDF_CONFIG.sections.length,
        totalSections: PDF_CONFIG.sections.length,
        progress: 100
      });
    }
  }, []);

  const startLoading = useCallback(async () => {
    // 检查是否已有缓存数据
    const cachedData = getCachedData();
    if (cachedData && Object.keys(cachedData.textData).length > 0) {
      setTextData(cachedData.textData);
      setHasLoaded(true);
      setLoadingStatus({
        isLoading: false,
        loadedSections: PDF_CONFIG.sections.length,
        totalSections: PDF_CONFIG.sections.length,
        progress: 100
      });
      return;
    }

    if (isLoading || hasLoaded || hasStartedLoading) {
      return;
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
    
    // 确保在客户端环境
    if (typeof window === 'undefined') {
      console.warn('PDF.js loading attempted on server side');
      return;
    }

    try {
      // 动态导入 PDF.js
      const pdfjsLib = await import('pdfjs-dist/webpack');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

      // 按大小排序章节，先加载小文件
      const sortedSections = [...PDF_CONFIG.sections].sort((a, b) => {
        const sizeA = parseFloat(a.size.replace('MB', ''));
        const sizeB = parseFloat(b.size.replace('MB', ''));
        return sizeA - sizeB;
      });
      
      for (const section of sortedSections) {
        try {
          setLoadingStatus(prev => ({
            ...prev,
            currentSection: section.name,
            error: undefined
          }));

          const response = await fetchWithRetry(section.filePath);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            
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
              } catch (err: any) {
                if (err.name !== 'RenderingCancelledException') {
                  console.error(`提取章节 ${section.name} 第 ${pageNum} 页文本失败:`, err);
                }
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
              progress,
              currentSection: section.name
            });

            // 每完成一个章节就保存一次缓存
            setCachedData(sectionsText);
          }
        } catch (error) {
          console.error(`Failed to load section ${section.name}:`, error);
          setLoadingStatus(prev => ({
            ...prev,
            error: `加载章节 ${section.name} 失败: ${error.message}`
          }));
          // 继续加载其他章节
        }
      }
      
      setTextData(sectionsText);
      setIsLoading(false);
      setHasLoaded(true);
      
    } catch (error) {
      console.error('Failed to initialize PDF.js:', error);
      setLoadingStatus(prev => ({
        ...prev,
        error: `初始化失败: ${error.message}`
      }));
    }
  }, [isLoading, hasLoaded, hasStartedLoading]);

  const isReady = !loadingStatus.isLoading && loadingStatus.loadedSections > 0;

  const clearCache = useCallback(() => {
    clearCachedData();
    setTextData({});
    setHasLoaded(false);
    setHasStartedLoading(false);
    setLoadingStatus({
      isLoading: false,
      loadedSections: 0,
      totalSections: PDF_CONFIG.sections.length,
      progress: 0
    });
  }, []);

  return (
    <PDFTextContext.Provider value={{
      textData,
      loadingStatus,
      isReady,
      startLoading,
      hasStartedLoading,
      clearCache
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