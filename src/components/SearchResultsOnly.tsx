'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  onSectionChange?: (sectionPath: string) => void;
  selectedPDF?: string;
  sharedSearchResults?: SmartSearchResult[];
  sharedSearchTerm?: string;
}

export default function SearchResultsOnly({ 
  onPageJump, 
  onSectionChange, 
  selectedPDF, 
  sharedSearchResults = [],
  sharedSearchTerm = ''
}: SearchResultsOnlyProps) {
  const [highlightIndex, setHighlightIndex] = useState(0);
  
  // 使用共享的搜索结果
  const results = sharedSearchResults;
  const searchTerm = sharedSearchTerm;
  
  console.log('SearchResultsOnly props:', { 
    resultsCount: results.length, 
    searchTerm, 
    hasResults: results.length > 0 
  });

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

  // 跳转到指定结果
  const goToResult = (index: number) => {
    if (index < 0 || index >= groupedResults.length) return;
    
    console.log('goToResult called:', { index, totalResults: groupedResults.length });
    
    setHighlightIndex(index);
    const result = groupedResults[index];
    const firstResult = result.results[0];
    
    console.log('Result details:', {
      sectionPath: firstResult.sectionPath,
      page: firstResult.page,
      selectedPDF,
      needsSectionChange: firstResult.sectionPath !== selectedPDF
    });
    
    // 查找对应的章节配置
    const section = PDF_CONFIG.sections.find(s => s.filePath === firstResult.sectionPath);
    if (!section) {
      console.log('Section not found for:', firstResult.sectionPath);
      return;
    }
    
    // 计算相对页码
    const relativePage = firstResult.page - section.startPage + 1;
    console.log('Calculated relative page:', relativePage, 'from actual page:', firstResult.page, 'start page:', section.startPage);
    
    // 如果需要切换章节
    if (onSectionChange && firstResult.sectionPath !== selectedPDF) {
      console.log('Switching section to:', firstResult.sectionPath);
      // 切换章节时不重置到第一页，让后续的页面跳转生效
      onSectionChange(firstResult.sectionPath, false);
      // 延迟跳转页面，等待PDF加载
      setTimeout(() => {
        if (onPageJump) {
          console.log('Jumping to page after section change:', relativePage);
          onPageJump(relativePage);
        }
      }, 500);
    } else {
      // 直接跳转页面
      if (onPageJump) {
        console.log('Jumping to page directly:', relativePage);
        onPageJump(relativePage);
      }
    }
  };

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

  // 当搜索结果更新时，自动跳转到第一条结果
  useEffect(() => {
    if (groupedResults.length > 0 && searchTerm) {
      goToResult(0);
    }
  }, [searchTerm]);

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
          <p className="text-sm text-gray-700 font-medium">No results found</p>
          <p className="text-xs text-gray-500 mt-1">Try different keywords for "{searchTerm}"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 导航控制 */}
      <div className="flex items-center justify-center px-4 py-3 bg-gray-50 border-b border-gray-200">
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

      {/* 搜索结果列表 */}
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
            <div className="px-4 py-3">
              <div className="flex items-center space-x-3">
                {/* 页码标签 */}
                <div className="flex-shrink-0">
                  <span className={`inline-flex items-center justify-center w-14 h-8 rounded-lg text-xs font-bold transition-all duration-200 ${
                    index === highlightIndex 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600'
                  }`}>
                    P{result.page}
                  </span>
                </div>
                
                {/* 章节信息 */}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate transition-colors duration-200 ${
                    index === highlightIndex 
                      ? 'text-blue-900' 
                      : 'text-gray-900 group-hover:text-gray-700'
                  }`}>
                    {result.sectionName}
                  </div>
                </div>
                
                {/* 匹配数量 */}
                {result.count > 1 && (
                  <div className="flex-shrink-0">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-all duration-200 ${
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