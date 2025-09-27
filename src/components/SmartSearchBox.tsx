'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search } from 'lucide-react';
import { CacheManager } from '@/lib/cache';
import { PerformanceMonitor } from '@/lib/performance';
import { PDF_CONFIG } from '@/config/pdf';

interface SmartSearchResult {
  page: number;
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
}

export default function SmartSearchBox({
  onSearchResults,
  onClearSearch,
  onUpdateURL,
  onLoadingStatusChange,
  currentSection,
  showSearchInHeader = false,
  initialSearchTerm = '',
  preloadedTextData = {},
  onSearchResultsUpdate
}: SmartSearchBoxProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [isSearching, setIsSearching] = useState(false);
  const [allSectionsText, setAllSectionsText] = useState<Record<string, string>>(preloadedTextData);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  
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
                let nextLines = lines.slice(lines.indexOf(line) + 1, lines.indexOf(line) + 3);
                context.push(...nextLines);
                
                results.push({
                  page: pageNumber,
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
    if (!searchTerm.trim() || Object.keys(allSectionsText).length === 0) {
      return;
    }

    setIsSearching(true);
    if (onLoadingStatusChange) {
      onLoadingStatusChange({ isLoading: true, progress: 0 });
    }

    try {
      const results = await searchInAllSections(searchTerm);
      onSearchResults(results);
      
      if (onSearchResultsUpdate) {
        onSearchResultsUpdate(results, searchTerm, 'global');
      }
      
      if (onUpdateURL) {
        onUpdateURL({ q: searchTerm });
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

  // 防抖搜索
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Only trigger search if searchTerm has actually changed
    if (searchTerm.trim() !== initialSearchTerm.trim()) {
      if (searchTerm.trim()) {
        searchTimeoutRef.current = setTimeout(() => {
          handleSearch();
        }, 300);
      } else {
        // Only clear search if we're not initializing with an empty search term
        if (initialSearchTerm.trim() === '') {
          onClearSearch();
        }
      }
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, handleSearch, onClearSearch, initialSearchTerm]);

  return (
    <div className={`relative ${showSearchInHeader ? 'w-full' : 'max-w-2xl mx-auto'}`}>
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search IMPA codes, names, or descriptions..."
          className="w-full pl-10 pr-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isSearching}
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600" />
          </div>
        )}
      </div>
    </div>
  );
}