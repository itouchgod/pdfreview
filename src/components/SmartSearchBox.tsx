'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { CacheManager } from '@/lib/cache';
import { PerformanceMonitor } from '@/lib/performance';
import { PDF_CONFIG } from '@/config/pdf';
import { SectionChangeHandler } from '@/types/pdf';

interface SmartSearchResult {
  page: number;
  relativePage?: number;
  text: string;
  index: number;
  context: string;
  sectionName: string;
  sectionPath: string;
  category: string;
}

interface SmartSearchBoxProps {
  onSearchResults: (results: SmartSearchResult[]) => void;
  onClearSearch: () => void;
  onUpdateURL?: (params: Record<string, string>) => void;
  onLoadingStatusChange?: (status: { isLoading: boolean; progress: number }) => void;
  currentSection?: string;
  showSearchInHeader?: boolean;
  initialSearchTerm?: string;
  preloadedTextData?: Record<string, string>;
  onSearchResultsUpdate?: (
    results: SmartSearchResult[],
    searchTerm: string,
    searchMode: 'current' | 'global'
  ) => void;
  onPageJump?: (pageNumber: number) => void;
  onSectionChange?: SectionChangeHandler;
  selectedPDF?: string;
}

export default function SmartSearchBox({
  onSearchResults,
  onClearSearch,
  onUpdateURL,
  onLoadingStatusChange,
  // currentSection,
  showSearchInHeader = false,
  initialSearchTerm = '',
  preloadedTextData = {},
  onSearchResultsUpdate
}: SmartSearchBoxProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [isSearching, setIsSearching] = useState(false);
  const [allSectionsText, setAllSectionsText] = useState<Record<string, string>>(preloadedTextData);
  // 保留 searchTimeoutRef 用于将来实现搜索防抖
  // const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const performanceMonitor = PerformanceMonitor.getInstance();
  const cacheManager = CacheManager.getInstance();

  // 更新文本数据
  useEffect(() => {
    setAllSectionsText(preloadedTextData);
  }, [preloadedTextData]);

  // 同步初始搜索词
  useEffect(() => {
    setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);

  // 智能搜索实现
  const searchInAllSections = useCallback(async (query: string): Promise<SmartSearchResult[]> => {
    const startTime = performanceMonitor.startMeasure('search');
    const results: SmartSearchResult[] = [];
    const searchTerm = query.toLowerCase();
    const searchTerms = searchTerm.split(' ').filter(Boolean);

    // 尝试从缓存获取搜索结果
    const cacheKey = `search:${searchTerm}`;
    const cachedResults = await cacheManager.get<SmartSearchResult[]>(cacheKey);
    
    if (cachedResults) {
      performanceMonitor.endMeasure('search', startTime, { cached: true });
      return cachedResults;
    }

    try {
      await Promise.all(
        Object.entries(allSectionsText).map(async ([sectionPath, text]) => {
          const lines = text.split('\n');
          let pageNumber = 1;
          let contextBuffer: string[] = [];
          
          for (const line of lines) {
            // 检查是否是页面分隔符
            const pageMatch = line.match(/--- 第 (\d+) 页 ---/);
            if (pageMatch) {
              pageNumber = parseInt(pageMatch[1]);
              contextBuffer = [];
              continue;
            }
            
            // 维护上下文缓冲区
            contextBuffer.push(line);
            if (contextBuffer.length > 5) {
              contextBuffer.shift();
            }
            
            // 搜索匹配
            const matches = searchTerms.every(term => 
              line.toLowerCase().includes(term)
            );
            
            if (matches) {
              const section = PDF_CONFIG.sections.find(s => s.filePath === sectionPath);
              if (section) {
                // 构建上下文
                const context = [...contextBuffer];
                const nextLines = lines.slice(lines.indexOf(line) + 1, lines.indexOf(line) + 3);
                context.push(...nextLines);
                
                // 计算相对页码
                const relativePage = pageNumber - section.startPage + 1;
                console.log('Search Result Debug:', {
                  pageNumber,
                  startPage: section.startPage,
                  relativePage,
                  sectionName: section.name
                });
                results.push({
                  page: pageNumber,          // 保持原始页码
                  relativePage: relativePage, // 添加相对页码
                  text: line.trim(),
                  index: results.length,
                  context: context.join('\n').trim(),
                  sectionName: section.name,
                  sectionPath: sectionPath,
                  category: 'search'
                });
              }
            }
          }
        })
      );

      // 缓存搜索结果
      await cacheManager.set(cacheKey, results, 3600000); // 1小时过期
      performanceMonitor.endMeasure('search', startTime, { 
        resultCount: results.length,
        cached: false 
      });
      
      return results;
    } catch (error) {
      console.error('Search error:', error);
      performanceMonitor.endMeasure('search', startTime, { error: true });
      return [];
    }
  }, [allSectionsText, performanceMonitor, cacheManager]);

  // 处理搜索
  const handleSearch = useCallback(async () => {
    if (Object.keys(allSectionsText).length === 0) {
      return;
    }

    setIsSearching(true);
    if (onLoadingStatusChange) {
      onLoadingStatusChange({ isLoading: true, progress: 0 });
    }

    try {
      if (!searchTerm.trim()) {
        onSearchResults([]);
        if (onSearchResultsUpdate) {
          onSearchResultsUpdate([], '', 'global');
        }
        if (onUpdateURL) {
          onUpdateURL({ query: '' });
        }
        return;
      }

      const results = await searchInAllSections(searchTerm);
      onSearchResults(results);
      
      if (onSearchResultsUpdate) {
        onSearchResultsUpdate(results, searchTerm, 'global');
      }
      
      if (onUpdateURL) {
        onUpdateURL({ query: searchTerm });
      }
    } finally {
      setIsSearching(false);
      if (onLoadingStatusChange) {
        onLoadingStatusChange({ isLoading: false, progress: 100 });
      }
    }
  }, [
    searchTerm,
    allSectionsText,
    onSearchResults,
    onSearchResultsUpdate,
    onUpdateURL,
    onLoadingStatusChange,
    searchInAllSections,
    setIsSearching
  ]);

  // 处理回车键搜索
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim() && !isSearching) {
      handleSearch();
    }
  };

  return (
    <div className={`relative ${showSearchInHeader ? 'w-full' : 'max-w-2xl mx-auto'}`}>
      <div className="relative group">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Search IMPA codes, names, or descriptions..."
          className="w-full pl-4 pr-20 py-3 bg-white border border-gray-200 rounded-full focus:outline-none focus:shadow-lg focus:border-transparent transition-all duration-200 hover:shadow-md"
          disabled={isSearching}
        />
        
        {/* 右侧按钮区域 */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {/* 清除按钮 */}
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                onClearSearch();
                if (onUpdateURL) {
                  onUpdateURL({ query: '' });
                }
              }}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          
          {/* 分隔线 */}
          {searchTerm && <div className="h-6 w-px bg-gray-200"></div>}
          
          {/* 搜索按钮 */}
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchTerm.trim()}
            className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isSearching ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-blue-600"></div>
            ) : (
              <Search className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}