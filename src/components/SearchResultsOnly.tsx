'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageCalculator } from '@/utils/pageCalculator';
import { SectionChangeHandler } from '@/types/pdf';
import { getGlassButtonBaseStyles, createGlassButtonHandlers, getIconStyles } from '@/lib/buttonStyles';

interface SmartSearchResult {
  page: number;
  text: string;
  index: number;
  context: string;
  sectionName: string;
  sectionPath: string;
  category: string;
}

interface GroupedResult {
  key: string;
  page: number;
  sectionPath: string;
  sectionName: string;
  results: SmartSearchResult[];
  count: number;
}

interface SearchResultsOnlyProps {
  onPageJump?: (pageNumber: number) => void;
  onSectionChange?: SectionChangeHandler;
  selectedPDF?: string;
  sharedSearchResults?: SmartSearchResult[];
  sharedSearchTerm?: string;
  currentResultIndex?: number;
  onResultIndexChange?: (index: number) => void;
  onPreviousResult?: () => void;
  onNextResult?: () => void;
  groupedResults?: GroupedResult[];
}

export default function SearchResultsOnly({ 
  onPageJump, 
  onSectionChange, 
  selectedPDF, 
  sharedSearchResults = [],
  sharedSearchTerm = '',
  currentResultIndex = 0,
  onResultIndexChange,
  onPreviousResult,
  onNextResult,
  groupedResults: externalGroupedResults
}: SearchResultsOnlyProps) {
  // 使用外部传入的当前结果索引，如果没有则使用内部状态
  const [internalHighlightIndex, setInternalHighlightIndex] = useState(0);
  const highlightIndex = currentResultIndex !== undefined ? currentResultIndex : internalHighlightIndex;
  
  // 调试信息已移除，避免循环渲染

  // 按页面分组搜索结果并排序
  const groupedResults = useMemo(() => {
    // 如果外部传入了分组结果，直接使用
    if (externalGroupedResults && externalGroupedResults.length > 0) {
      return externalGroupedResults;
    }
    
    // 否则自己计算分组结果
    const groups = new Map<string, SmartSearchResult[]>();
    
    sharedSearchResults.forEach(result => {
      const key = `${result.sectionPath}-${result.page}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(result);
    });
    
    // 将分组结果转换为数组并排序
    const groupedArray = Array.from(groups.entries()).map(([key, groupResults]) => ({
      key,
      page: groupResults[0].page,
      sectionPath: groupResults[0].sectionPath,
      sectionName: groupResults[0].sectionName,
      results: groupResults,
      count: groupResults.length
    }));
    
    // 按绝对页码排序，确保搜索结果按页码顺序显示
    return groupedArray.sort((a, b) => a.page - b.page);
  }, [sharedSearchResults, externalGroupedResults]);

  // 当搜索结果更新时，只在没有外部控制时自动选中第一个结果
  const lastSearchTermRef = useRef<string>('');
  useEffect(() => {
    if (sharedSearchTerm && sharedSearchTerm !== lastSearchTermRef.current) {
      lastSearchTermRef.current = sharedSearchTerm;
      // 只有在没有外部索引控制时才重置为第一个结果
      if (!onResultIndexChange) {
        setInternalHighlightIndex(0);
      }
    }
  }, [sharedSearchTerm, onResultIndexChange]);

  // 同步外部 currentResultIndex 到内部状态
  useEffect(() => {
    if (currentResultIndex !== undefined && currentResultIndex !== internalHighlightIndex) {
      setInternalHighlightIndex(currentResultIndex);
    }
  }, [currentResultIndex, internalHighlightIndex]);

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
    
    if (!selectedPDF) {
      console.error('No PDF selected');
      return;
    }
    
    // 如果需要切换章节
    if (onSectionChange && firstResult.sectionPath !== selectedPDF) {
      // 通用PDF平台：简化处理，直接使用页码
      const targetRelativePage = firstResult.page || 1;
      
      // 切换到目标章节和页码
      onSectionChange(firstResult.sectionPath, targetRelativePage);
    } else {
      // 在当前章节内跳转
      if (onPageJump) {
        // 通用PDF平台：简化处理，直接使用页码
        const targetPage = firstResult.page || 1;
        
        onPageJump(targetPage);
      }
    }
  }, [groupedResults, selectedPDF, onSectionChange, onPageJump, onResultIndexChange]);

  // 导航到上一个/下一个结果
  const goToPrevious = () => {
    if (onPreviousResult) {
      onPreviousResult();
    } else if (highlightIndex > 0) {
      goToResult(highlightIndex - 1);
    }
  };

  const goToNext = () => {
    if (onNextResult) {
      onNextResult();
    } else if (highlightIndex < groupedResults.length - 1) {
      goToResult(highlightIndex + 1);
    }
  };

  // 去除自动跳转逻辑，只保留手动点击跳转功能

  // 如果没有搜索词，显示提示信息
  if (!sharedSearchTerm) {
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
          <p className="text-xs text-gray-500 mt-1">Search term: &ldquo;{sharedSearchTerm}&rdquo;</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* 导航控制 - 桌面端显示，手机端隐藏（因为手机端有专门的标题栏） */}
      <div className="hidden lg:flex items-center justify-center px-4 py-2 bg-muted border-b border-border/30">
        <div className="flex items-center space-x-2">
          {(() => {
            const buttonConfig = getGlassButtonBaseStyles('md');
            const handlers = createGlassButtonHandlers();
            return (
              <>
                <button
                  onClick={goToPrevious}
                  disabled={highlightIndex === 0 || groupedResults.length === 0}
                  className={buttonConfig.className}
                  style={buttonConfig.style}
                  onMouseEnter={handlers.onMouseEnter}
                  onMouseLeave={handlers.onMouseLeave}
                  title="Previous Result (↑ or ←)"
                >
                  <ChevronLeft className={`${getIconStyles('md')} group-hover:-translate-x-0.5`} />
                </button>
                
                <span className="text-xs font-medium text-slate-600 tracking-wide px-2 py-1 transition-all duration-200 hover:text-slate-800">
                  {groupedResults.length > 0 ? `${highlightIndex + 1} / ${groupedResults.length}` : '0 / 0'}
                </span>
                
                <button
                  onClick={goToNext}
                  disabled={highlightIndex >= groupedResults.length - 1 || groupedResults.length === 0}
                  className={buttonConfig.className}
                  style={buttonConfig.style}
                  onMouseEnter={handlers.onMouseEnter}
                  onMouseLeave={handlers.onMouseLeave}
                  title="Next Result (↓ or →)"
                >
                  <ChevronRight className={`${getIconStyles('md')} group-hover:translate-x-0.5`} />
                </button>
              </>
            );
          })()}
        </div>
      </div>

      {/* 搜索结果列表 - 手机端优化布局 */}
      <div className="flex-1 overflow-y-auto">
        {groupedResults.map((result, index) => (
          <div
            key={result.key}
            onClick={() => goToResult(index)}
            className={`group cursor-pointer transition-all duration-200 border-b border-border/20 last:border-b-0 ${
              index === highlightIndex 
                ? 'bg-primary/15 shadow-sm' 
                : 'hover:bg-accent/50'
            }`}
          >
            <div className="px-2 sm:px-3 py-1.5 sm:py-2">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                {/* 页码标签 - 更紧凑 */}
                <div className="flex-shrink-0">
                  <span className={`inline-flex items-center justify-center w-8 h-5 sm:w-10 sm:h-6 rounded text-xs font-semibold transition-all duration-200 ${
                    index === highlightIndex 
                      ? 'bg-primary/80 text-primary-foreground shadow-sm' 
                      : 'bg-muted text-muted-foreground group-hover:bg-primary/30 group-hover:text-primary'
                  }`}>
                    P{result.page}
                  </span>
                </div>
                
                {/* 章节信息 - 更小的字体和紧凑间距 */}
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-normal transition-colors duration-200 leading-tight ${
                    index === highlightIndex 
                      ? 'text-primary/90' 
                      : 'text-card-foreground group-hover:text-foreground'
                  }`}>
                    {/* 手机端显示更紧凑的章节名称 */}
                    <div className="block sm:hidden">
                      {result.sectionName.length > 30 
                        ? `${result.sectionName.substring(0, 30)}...` 
                        : result.sectionName}
                    </div>
                    {/* 桌面端显示完整章节名称 */}
                    <div className="hidden sm:block truncate">
                      {result.sectionName}
                    </div>
                  </div>
                </div>
                
                {/* 匹配数量 - 更小 */}
                {result.count > 1 && (
                  <div className="flex-shrink-0">
                    <span className={`inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full text-xs font-medium transition-all duration-200 ${
                      index === highlightIndex 
                        ? 'bg-primary/15 text-primary/80' 
                        : 'bg-muted text-muted-foreground group-hover:bg-accent group-hover:text-accent-foreground'
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