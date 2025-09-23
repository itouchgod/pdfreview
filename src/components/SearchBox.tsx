'use client';

import { useState, useEffect } from 'react';
import { Search, X, FileText } from 'lucide-react';
import SearchSuggestions from './SearchSuggestions';

interface SearchResult {
  page: number;
  text: string;
  index: number;
  context: string;
}

interface SearchBoxProps {
  fullText: string;
  onSearchResults: (results: SearchResult[]) => void;
  onClearSearch: () => void;
  onPageJump?: (pageNumber: number) => void;
  currentSection?: string;
  onSectionChange?: (sectionName: string) => void;
}

export default function SearchBox({ fullText, onSearchResults, onClearSearch, onPageJump, currentSection, onSectionChange }: SearchBoxProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const searchInText = (text: string, term: string): SearchResult[] => {
    if (!term.trim()) return [];
    
    const results: SearchResult[] = [];
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    
    // 按页面分割文本
    const pages = text.split('--- 第 ');
    
    pages.forEach((pageContent, pageIndex) => {
      if (pageIndex === 0) return; // 跳过第一个空元素
      
      const pageMatch = pageContent.match(/^(\d+) 页 ---/);
      if (!pageMatch) return;
      
      const pageNum = parseInt(pageMatch[1]);
      const pageText = pageContent.replace(/^\d+ 页 ---\n/, '');
      
      let match;
      while ((match = regex.exec(pageText)) !== null) {
        const start = Math.max(0, match.index - 50);
        const end = Math.min(pageText.length, match.index + match[0].length + 50);
        const context = pageText.substring(start, end);
        
        results.push({
          page: pageNum,
          text: match[0],
          index: match.index,
          context: context
        });
      }
    });
    
    return results;
  };

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setResults([]);
      onSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    
    // 使用 setTimeout 来避免阻塞UI
    setTimeout(() => {
      const searchResults = searchInText(fullText, searchTerm);
      setResults(searchResults);
      setHighlightIndex(0);
      onSearchResults(searchResults);
      setIsSearching(false);
    }, 100);
  };

  const handleClear = () => {
    setSearchTerm('');
    setResults([]);
    setHighlightIndex(0);
    onSearchResults([]);
    onClearSearch();
  };

  const goToResult = (index: number) => {
    if (index >= 0 && index < results.length) {
      setHighlightIndex(index);
      const result = results[index];
      // 跳转到对应页面
      if (onPageJump) {
        onPageJump(result.page);
      }
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        handleSearch();
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [searchTerm, fullText]);

  return (
    <div className="space-y-4">
      {/* 搜索输入框 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索PDF内容... (Ctrl+Enter 快速搜索)"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchTerm.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isSearching ? '搜索中...' : '搜索'}
          </button>
        </div>
        
        {searchTerm && (
          <div className="mt-2 text-sm text-gray-600">
            提示：使用 Ctrl+Enter 快速搜索
          </div>
        )}
        
        {/* 搜索建议 */}
        <SearchSuggestions
          searchTerm={searchTerm}
          onSelectSection={(sectionName, sectionPath) => {
            if (onSectionChange) {
              onSectionChange(sectionPath);
            }
          }}
          currentSection={currentSection}
        />
      </div>

      {/* 搜索结果 */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                搜索结果 ({results.length} 个匹配项)
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => goToResult(highlightIndex - 1)}
                  disabled={highlightIndex <= 0}
                  className="px-2 py-1 text-sm bg-gray-100 text-gray-700 rounded disabled:bg-gray-50 disabled:text-gray-400"
                >
                  上一个
                </button>
                <span className="text-sm text-gray-500">
                  {highlightIndex + 1} / {results.length}
                </span>
                <button
                  onClick={() => goToResult(highlightIndex + 1)}
                  disabled={highlightIndex >= results.length - 1}
                  className="px-2 py-1 text-sm bg-gray-100 text-gray-700 rounded disabled:bg-gray-50 disabled:text-gray-400"
                >
                  下一个
                </button>
              </div>
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  index === highlightIndex ? 'bg-blue-50 border-blue-200' : ''
                }`}
                onClick={() => goToResult(index)}
              >
                <div className="flex items-start space-x-3">
                  <FileText className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium text-blue-600">
                        第 {result.page} 页
                      </span>
                      {currentSection && (
                        <span className="text-xs text-gray-500">
                          {currentSection}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        位置: {result.index}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700">
                      ...{result.context}...
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      匹配文本: "{result.text}"
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 无结果提示 */}
      {searchTerm && results.length === 0 && !isSearching && (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">未找到匹配结果</h3>
          <p className="text-gray-500">
            没有找到包含 "{searchTerm}" 的内容，请尝试其他关键词
          </p>
        </div>
      )}
    </div>
  );
}

