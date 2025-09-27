'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
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

interface SearchResultsOnlyProps {
  onPageJump?: (pageNumber: number) => void;
  onSectionChange?: (sectionPath: string, resetToFirstPage?: boolean) => void;
  currentSection?: string;
  selectedPDF?: string;
  initialSearchTerm?: string;
  preloadedTextData?: any;
  sharedSearchResults?: SmartSearchResult[];
  sharedSearchTerm?: string;
  sharedSearchMode?: 'current' | 'global';
  currentResultIndex?: number;
  onResultIndexChange?: (index: number) => void;
}

export default function SearchResultsOnly({ 
  onPageJump, 
  onSectionChange, 
  // currentSection, // eslint-disable-line @typescript-eslint/no-unused-vars
  selectedPDF, 
  // initialSearchTerm, // eslint-disable-line @typescript-eslint/no-unused-vars
  // preloadedTextData, // eslint-disable-line @typescript-eslint/no-unused-vars
  sharedSearchResults = [],
  sharedSearchTerm = '',
  // sharedSearchMode, // eslint-disable-line @typescript-eslint/no-unused-vars
  currentResultIndex = 0,
  onResultIndexChange
}: SearchResultsOnlyProps) {
  // 使用外部传入的当前结果索引，如果没有则使用内部状态
  const [internalHighlightIndex, setInternalHighlightIndex] = useState(0);
  const highlightIndex = currentResultIndex !== undefined ? currentResultIndex : internalHighlightIndex;
  
  // 使用共享的搜索结果
  const results = sharedSearchResults;
  const searchTerm = sharedSearchTerm;
  
  // 调试信息已移除，避免循环渲染

  // 按页面分组搜索结果
  const groupedResults = useMemo(() => {
    const groups = new Map<string, SmartSearchResult[]>();
    
    results.forEach(result => {
      const key = `${result.sectionPath}-${result.page}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(result);
    });
    
    return Array.from(groups.entries()).map(([key, groupResults]) => ({
      key,
      page: groupResults[0].page,
      sectionPath: groupResults[0].sectionPath,
      sectionName: groupResults[0].sectionName,
      results: groupResults,
      count: groupResults.length
    }));
  }, [results]);

  // 当搜索结果更新时，自动选中第一个结果
  const lastSearchTermRef = useRef<string>('');
  useEffect(() => {
    if (searchTerm && searchTerm !== lastSearchTermRef.current) {
      console.log('Auto-selecting first result for new search term:', searchTerm);
      lastSearchTermRef.current = searchTerm;
      // 重置为第一个结果
      if (onResultIndexChange) {
        onResultIndexChange(0);
      } else {
        setInternalHighlightIndex(0);
      }
    }
  }, [searchTerm, onResultIndexChange]);

  // 跳转到指定结果（仅用于点击跳转）
  const goToResult = useCallback((index: number) => {
    if (index < 0 || index >= groupedResults.length) return;
    
    // 更新外部状态或内部状态
    if (onResultIndexChange) {
      onResultIndexChange(index);
    } else {
      setInternalHighlightIndex(index);
    }
    
    const result = groupedResults[index];
    const firstResult = result.results[0];
    
    // 查找对应的章节配置
    const section = PDF_CONFIG.sections.find(s => s.filePath === firstResult.sectionPath);
    if (!section) return;
    
    // 计算相对页码
    const relativePage = firstResult.page - section.startPage + 1;
    
    // 验证页码有效性
    if (relativePage < 1 || relativePage > (section.endPage - section.startPage + 1)) {
      console.log('Invalid relative page in SearchResultsOnly:', { 
        relativePage, 
        actualPage: firstResult.page, 
        startPage: section.startPage, 
        endPage: section.endPage 
      });
      return;
    }
    
    // 如果需要切换章节
    if (onSectionChange && firstResult.sectionPath !== selectedPDF) {
      console.log('Switching section for search result:', firstResult.sectionPath);
      onSectionChange(firstResult.sectionPath, false);
      
      // 使用更长的延迟和重试机制来确保PDF加载完成
      let retryCount = 0;
      const maxRetries = 5;
      const checkAndJump = () => {
        if (retryCount >= maxRetries) {
          console.log('Max retries reached, giving up on page jump');
          return;
        }
        
        const pdfElement = document.querySelector('canvas');
        if (pdfElement) {
          console.log('PDF canvas found, jumping to page:', relativePage);
          if (onPageJump) {
            onPageJump(relativePage);
          }
        } else {
          console.log('PDF not ready yet, retrying...', { retryCount });
          retryCount++;
          setTimeout(checkAndJump, 300);
        }
      };
      
      // 开始第一次检查
      setTimeout(checkAndJump, 300);
    } else {
      // 直接跳转页面
      if (onPageJump) {
        onPageJump(relativePage);
      }
    }
  }, [groupedResults, selectedPDF, onSectionChange, onPageJump, onResultIndexChange]);

  // 导航到上一个/下一个结果
  const goToPrevious = () => {
    if (highlightIndex > 0) {
      goToResult(highlightIndex - 1);
    }
  };

  const goToNext = () => {
    if (highlightIndex < groupedResults.length - 1) {
      goToResult(highlightIndex + 1);
    }
  };

  // 去除自动跳转逻辑，只保留手动点击跳转功能

  // 如果没有搜索词，显示提示信息
  if (!searchTerm) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 font-medium">Search for content</p>
          <p className="text-xs text-gray-400 mt-1">Use the search box above to find information</p>
        </div>
      </div>
    );
  }

  // 如果没有结果，显示无结果信息
  if (groupedResults.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-red-400" />
          </div>
          <p className="text-sm text-gray-700 font-medium">No results found, please try different keywords</p>
          <p className="text-xs text-gray-500 mt-1">Search term: &ldquo;{searchTerm}&rdquo;</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 导航控制 - 桌面端显示，手机端隐藏（因为手机端有专门的标题栏） */}
      <div className="hidden lg:flex items-center justify-center px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <button
            onClick={goToPrevious}
            disabled={highlightIndex === 0}
            className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-gray-700 px-3 py-1 bg-white rounded-full shadow-sm">
            {highlightIndex + 1} / {groupedResults.length}
          </span>
          <button
            onClick={goToNext}
            disabled={highlightIndex === groupedResults.length - 1}
            className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 搜索结果列表 - 手机端优化布局 */}
      <div className="flex-1 overflow-y-auto">
        {groupedResults.map((result, index) => (
          <div
            key={result.key}
            onClick={() => goToResult(index)}
            className={`group cursor-pointer transition-all duration-200 ${
              index === highlightIndex 
                ? 'bg-blue-50 border-l-4 border-l-blue-500 shadow-sm' 
                : 'hover:bg-gray-50 border-l-4 border-l-transparent'
            }`}
          >
            <div className="px-3 sm:px-4 py-2 sm:py-3">
              <div className="flex items-center space-x-2 sm:space-x-3">
                {/* 页码标签 - 手机端更紧凑 */}
                <div className="flex-shrink-0">
                  <span className={`inline-flex items-center justify-center w-10 h-6 sm:w-14 sm:h-8 rounded-lg text-xs font-bold transition-all duration-200 ${
                    index === highlightIndex 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600'
                  }`}>
                    P{result.page}
                  </span>
                </div>
                
                {/* 章节信息 - 手机端优化文本显示 */}
                <div className="flex-1 min-w-0">
                  <div className={`text-xs sm:text-sm font-medium transition-colors duration-200 ${
                    index === highlightIndex 
                      ? 'text-blue-900' 
                      : 'text-gray-900 group-hover:text-gray-700'
                  }`}>
                    {/* 手机端显示更紧凑的章节名称 */}
                    <div className="block sm:hidden">
                      {result.sectionName.length > 25 
                        ? `${result.sectionName.substring(0, 25)}...` 
                        : result.sectionName}
                    </div>
                    {/* 桌面端显示完整章节名称 */}
                    <div className="hidden sm:block truncate">
                      {result.sectionName}
                    </div>
                  </div>
                </div>
                
                {/* 匹配数量 - 手机端更小 */}
                {result.count > 1 && (
                  <div className="flex-shrink-0">
                    <span className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-xs font-medium transition-all duration-200 ${
                      index === highlightIndex 
                        ? 'bg-blue-200 text-blue-800' 
                        : 'bg-gray-200 text-gray-600 group-hover:bg-green-200 group-hover:text-green-800'
                    }`}>
                      {result.count}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}