'use client';

import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
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
  onPageJump?: (pageNumber: number) => void;
  onSectionChange?: (sectionPath: string) => void;
  onLoadingStatusChange?: (status: { isLoading: boolean; progress: number }) => void;
  onUpdateURL?: (params: { query?: string; section?: string; page?: number }) => void;
  currentSection?: string;
  selectedPDF?: string;
  showSearchInHeader?: boolean;
  showSearchInSidebar?: boolean;
  initialSearchTerm?: string;
  preloadedTextData?: Record<string, string>;
  onSearchResultsUpdate?: (results: SmartSearchResult[], searchTerm: string, searchMode: 'global') => void;
}

export default function SmartSearchBox({ 
  onSearchResults, 
  onClearSearch, 
  onUpdateURL, 
  onLoadingStatusChange,
  currentSection, // eslint-disable-line @typescript-eslint/no-unused-vars
  showSearchInHeader = false, 
  initialSearchTerm = '', 
  preloadedTextData = {}, 
  onSearchResultsUpdate 
}: SmartSearchBoxProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [isSearching, setIsSearching] = useState(false);
  const [allSectionsText, setAllSectionsText] = useState<Record<string, string>>(preloadedTextData);

  // 更新文本数据
  useEffect(() => {
    setAllSectionsText(preloadedTextData);
  }, [preloadedTextData]);

  // 搜索所有章节
  const searchInAllSections = (query: string): SmartSearchResult[] => {
    const results: SmartSearchResult[] = [];
    const searchTerm = query.toLowerCase();

    Object.entries(allSectionsText).forEach(([sectionPath, text]) => {
      const lines = text.split('\n');
      let pageNumber = 1;
      
      lines.forEach((line) => {
        // 检查是否是页面分隔符
        if (line.includes('--- 第') && line.includes('页 ---')) {
          const pageMatch = line.match(/第 (\d+) 页/);
          if (pageMatch) {
            pageNumber = parseInt(pageMatch[1]);
          }
          return;
        }
        
        // 搜索匹配
        if (line.toLowerCase().includes(searchTerm)) {
          const section = PDF_CONFIG.sections.find(s => s.filePath === sectionPath);
          if (section) {
          results.push({
              page: pageNumber,
              text: line.trim(),
              index: results.length,
              context: line.trim(),
              sectionName: section.name,
              sectionPath: sectionPath,
              category: 'search'
            });
          }
        }
      });
    });
    
    return results;
  };

  const handleSearch = () => {
    console.log('handleSearch called:', { searchTerm, textDataCount: Object.keys(allSectionsText).length });
    if (!searchTerm.trim() || Object.keys(allSectionsText).length === 0) {
      console.log('Search skipped:', { hasSearchTerm: !!searchTerm.trim(), hasTextData: Object.keys(allSectionsText).length > 0 });
      return;
    }

    setIsSearching(true);
    
    // 更新加载状态
    if (onLoadingStatusChange) {
      onLoadingStatusChange({ isLoading: true, progress: 0 });
    }
    
    setTimeout(() => {
      const searchResults = searchInAllSections(searchTerm);
      console.log('Search results:', { count: searchResults.length, searchTerm });
      onSearchResults(searchResults);
      
      // 通知父组件搜索结果更新
      if (onSearchResultsUpdate) {
        onSearchResultsUpdate(searchResults, searchTerm, 'global');
      }
      
      setIsSearching(false);
      
      // 更新加载状态
      if (onLoadingStatusChange) {
        onLoadingStatusChange({ isLoading: false, progress: 100 });
      }
    }, 100);
  };

  const handleClear = () => {
    setSearchTerm('');
    onSearchResults([]);
    onClearSearch();
    
    // 清除URL参数
    if (onUpdateURL) {
      onUpdateURL({});
    }
  };

  // 搜索输入框
  const renderSearchInput = () => (
    <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        placeholder={`Search in all ${PDF_CONFIG.sections.length} sections...`}
        className="w-full pl-4 pr-20 py-3 bg-white border border-gray-200 rounded-full focus:outline-none focus:shadow-lg focus:border-transparent transition-all duration-200 hover:shadow-md"
            />
            {searchTerm && (
              <button
                onClick={handleClear}
          className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1"
              >
          <X className="h-5 w-5" />
              </button>
            )}
          <button
            onClick={handleSearch}
        disabled={isSearching || !searchTerm.trim()}
        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        {isSearching ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-500"></div>
        ) : (
          <Search className="h-5 w-5" />
        )}
          </button>
        </div>
  );
        
  // Header模式下的简洁搜索框
  if (showSearchInHeader) {
    return (
      <div>
        {renderSearchInput()}
      </div>
    );
  }

  // 默认模式
  return (
    <div className="space-y-4">
      {renderSearchInput()}
    </div>
  );
}