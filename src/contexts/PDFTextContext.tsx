'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// PDF文本数据类型
export interface PDFTextData {
  [filePath: string]: string;
}

// 加载状态类型
export interface LoadingStatus {
  isLoading: boolean;
  loadedSections: number;
  totalSections: number;
  progress: number;
}

// 缓存数据类型
interface CachedData {
  textData: PDFTextData;
  timestamp: number;
  version: string;
}

// Context类型
interface PDFTextContextType {
  textData: PDFTextData;
  loadingStatus: LoadingStatus;
  isLoading: boolean;
  hasLoaded: boolean;
  isReady: boolean;
  startLoading: () => void;
  clearCache: () => void;
}

const PDFTextContext = createContext<PDFTextContextType | undefined>(undefined);

// 缓存配置
const CACHE_KEY = 'pdf_text_cache';
const CACHE_VERSION = '1.0.0';
const CACHE_EXPIRY_DAYS = 7; // 缓存7天

// 缓存工具函数
const getCachedData = (): CachedData | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const data: CachedData = JSON.parse(cached);
    const now = Date.now();
    const expiryTime = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    
    // 检查版本和过期时间
    if (data.version !== CACHE_VERSION || (now - data.timestamp) > expiryTime) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error reading cache:', error);
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
    console.error('Error saving cache:', error);
  }
};

// 重试获取PDF文本的函数
const fetchWithRetry = async (url: string, retries: number = 3): Promise<string> => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed for ${url}:`, error);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries`);
};

export function PDFTextProvider({ children }: { children: ReactNode }) {
  const [textData, setTextData] = useState<PDFTextData>({});
  const [loadingStatus, setLoadingStatus] = useState<LoadingStatus>({
    isLoading: false,
    loadedSections: 0,
    totalSections: 0,
    progress: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(true); // 通用PDF平台不需要预加载
  const [isClient, setIsClient] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 标记客户端已挂载
  useEffect(() => {
    setIsClient(true);
    setMounted(true);
    // 通用PDF平台不需要预加载数据
  }, []);

  const startLoading = useCallback(async () => {
    // 通用PDF平台：不需要预加载数据
    setTextData({});
    setHasLoaded(true);
    setLoadingStatus({
      isLoading: false,
      loadedSections: 0,
      totalSections: 0,
      progress: 100
    });
  }, []);

  const clearCache = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CACHE_KEY);
    }
    setTextData({});
    setHasLoaded(false);
    setHasStartedLoading(false);
    setLoadingStatus({
      isLoading: false,
      loadedSections: 0,
      totalSections: 0,
      progress: 0
    });
  }, []);

  const isReady = hasLoaded && !isLoading;

  const value: PDFTextContextType = {
    textData,
    loadingStatus,
    isLoading,
    hasLoaded,
    isReady,
    startLoading,
    clearCache
  };

  return (
    <PDFTextContext.Provider value={value}>
      {children}
    </PDFTextContext.Provider>
  );
}

export function usePDFText(): PDFTextContextType {
  const context = useContext(PDFTextContext);
  if (context === undefined) {
    throw new Error('usePDFText must be used within a PDFTextProvider');
  }
  return context;
}