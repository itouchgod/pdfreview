'use client';

import * as pdfjsLib from 'pdfjs-dist';

// 配置PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
}

export interface ExtractedTextData {
  [pageNumber: number]: string;
}

export interface PDFTextCache {
  [pdfUrl: string]: {
    textData: ExtractedTextData;
    totalPages: number;
    extractedAt: number;
    fileSize: number;
  };
}

export class PDFTextExtractor {
  private static instance: PDFTextExtractor;
  private cache: PDFTextCache = {};
  private readonly CACHE_KEY = 'pdf_text_extraction_cache';
  private readonly CACHE_EXPIRY_DAYS = 7;

  private constructor() {
    this.loadCache();
  }

  public static getInstance(): PDFTextExtractor {
    if (!PDFTextExtractor.instance) {
      PDFTextExtractor.instance = new PDFTextExtractor();
    }
    return PDFTextExtractor.instance;
  }

  private loadCache(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        const now = Date.now();
        const expiryTime = this.CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        
        // 清理过期的缓存
        Object.keys(data).forEach(url => {
          if ((now - data[url].extractedAt) > expiryTime) {
            delete data[url];
          }
        });
        
        this.cache = data;
      }
    } catch (error) {
      console.error('Failed to load PDF text cache:', error);
      this.cache = {};
    }
  }

  private saveCache(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      console.error('Failed to save PDF text cache:', error);
    }
  }

  public async extractTextFromPDF(pdfUrl: string, fileSize?: number): Promise<ExtractedTextData | null> {
    // 检查缓存
    if (this.cache[pdfUrl]) {
      console.log('Using cached text for PDF:', pdfUrl);
      return this.cache[pdfUrl].textData;
    }

    try {
      console.log('Extracting text from PDF:', pdfUrl);
      
      // 加载PDF文档
      const loadingTask = pdfjsLib.getDocument({
        url: pdfUrl,
        cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
        // 添加错误处理选项
        stopAtErrors: false,
        maxImageSize: 1024 * 1024, // 1MB
        isEvalSupported: false,
        useSystemFonts: false,
        // 添加重试机制
        retryDelay: 1000,
        maxRetries: 3
      });

      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;
      const textData: ExtractedTextData = {};

      // 提取每一页的文本
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ')
            .trim();
          
          if (pageText) {
            textData[pageNum] = pageText;
          }
        } catch (pageError) {
          console.warn(`Failed to extract text from page ${pageNum}:`, pageError);
          // 继续处理其他页面
        }
      }

      // 只有在成功提取到文本时才缓存结果
      if (Object.keys(textData).length > 0) {
        this.cache[pdfUrl] = {
          textData,
          totalPages,
          extractedAt: Date.now(),
          fileSize: fileSize || 0
        };
        
        this.saveCache();
        
        console.log(`Successfully extracted text from ${Object.keys(textData).length}/${totalPages} pages`);
      } else {
        console.warn('No text content found in PDF');
      }
      
      return textData;
    } catch (error) {
      console.error('Failed to extract text from PDF:', error);
      
      // 如果是blob URL错误，清理相关缓存
      if (pdfUrl.startsWith('blob:') && (
        error.name === 'UnexpectedResponseException' || 
        error.message?.includes('ERR_FILE_NOT_FOUND') ||
        error.message?.includes('Failed to fetch')
      )) {
        console.warn('Blob URL expired, clearing related cache');
        delete this.cache[pdfUrl];
        this.saveCache();
      }
      
      return null;
    }
  }

  public getCachedText(pdfUrl: string): ExtractedTextData | null {
    return this.cache[pdfUrl]?.textData || null;
  }

  public hasCachedText(pdfUrl: string): boolean {
    return !!this.cache[pdfUrl];
  }

  public clearCache(pdfUrl?: string): void {
    if (pdfUrl) {
      delete this.cache[pdfUrl];
    } else {
      this.cache = {};
    }
    this.saveCache();
  }

  public getAllCachedTexts(): PDFTextCache {
    return { ...this.cache };
  }

  public searchInPDF(pdfUrl: string, searchTerm: string): Array<{
    page: number;
    text: string;
    context: string;
  }> {
    const textData = this.getCachedText(pdfUrl);
    if (!textData) return [];

    const results: Array<{
      page: number;
      text: string;
      context: string;
    }> = [];

    const searchLower = searchTerm.toLowerCase();
    const searchTerms = searchLower.split(' ').filter(Boolean);

    Object.entries(textData).forEach(([pageStr, pageText]) => {
      const pageNum = parseInt(pageStr);
      const lines = pageText.split('\n');
      
      lines.forEach((line, lineIndex) => {
        const lineLower = line.toLowerCase();
        
        // 检查是否包含所有搜索词
        const matches = searchTerms.every(term => lineLower.includes(term));
        
        if (matches && line.trim()) {
          // 获取关键词周围的上下文
          const getContextAroundKeyword = (text: string, keyword: string, contextWords: number = 8) => {
            const words = text.split(/\s+/);
            const keywordLower = keyword.toLowerCase();
            
            // 找到关键词的位置
            let keywordIndex = -1;
            for (let i = 0; i < words.length; i++) {
              if (words[i].toLowerCase().includes(keywordLower)) {
                keywordIndex = i;
                break;
              }
            }
            
            if (keywordIndex === -1) {
              return text; // 如果找不到关键词，返回原文本
            }
            
            // 获取关键词前后的词
            const start = Math.max(0, keywordIndex - contextWords);
            const end = Math.min(words.length, keywordIndex + contextWords + 1);
            const contextWords_array = words.slice(start, end);
            
            return contextWords_array.join(' ');
          };
          
          // 为每个搜索词生成上下文
          let bestContext = line.trim();
          for (const term of searchTerms) {
            const context = getContextAroundKeyword(line, term, 6);
            if (context.length > bestContext.length) {
              bestContext = context;
            }
          }
          
          results.push({
            page: pageNum,
            text: line.trim(),
            context: bestContext
          });
        }
      });
    });

    return results;
  }

  public searchInAllPDFs(searchTerm: string): Array<{
    pdfUrl: string;
    page: number;
    text: string;
    context: string;
  }> {
    const allResults: Array<{
      pdfUrl: string;
      page: number;
      text: string;
      context: string;
    }> = [];

    Object.keys(this.cache).forEach(pdfUrl => {
      const pdfResults = this.searchInPDF(pdfUrl, searchTerm);
      pdfResults.forEach(result => {
        allResults.push({
          pdfUrl,
          ...result
        });
      });
    });

    return allResults;
  }
}
