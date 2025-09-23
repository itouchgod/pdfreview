'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, FileText, Globe } from 'lucide-react';
import { PDF_CONFIG } from '@/config/pdf';

interface GlobalSearchResult {
  page: number;
  text: string;
  index: number;
  context: string;
  sectionName: string;
  sectionPath: string;
  category: string;
}

interface GlobalSearchBoxProps {
  onSearchResults: (results: GlobalSearchResult[]) => void;
  onClearSearch: () => void;
  onPageJump?: (pageNumber: number) => void;
  onSectionChange?: (sectionPath: string) => void;
}

export default function GlobalSearchBox({ onSearchResults, onClearSearch, onPageJump, onSectionChange }: GlobalSearchBoxProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [allSectionsText, setAllSectionsText] = useState<Record<string, string>>({});
  const [isLoadingText, setIsLoadingText] = useState(true);
  const [loadedSections, setLoadedSections] = useState(0);

  // 加载所有章节的文本内容
  useEffect(() => {
    const loadAllSections = async () => {
      const sectionsText: Record<string, string> = {};
      
      // 动态导入PDF.js
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      
      for (const section of PDF_CONFIG.sections) {
        try {
          const response = await fetch(section.filePath);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const pdf = await (pdfjsLib as any).getDocument(arrayBuffer).promise;
            
            let fullText = '';
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
              try {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                  .map((item: any) => item.str)
                  .join(' ');
                fullText += `\n--- 第 ${pageNum} 页 ---\n${pageText}\n`;
              } catch (err) {
                console.error(`提取章节 ${section.name} 第 ${pageNum} 页文本失败:`, err);
              }
            }
            
            sectionsText[section.filePath] = fullText;
            setLoadedSections(prev => prev + 1);
            console.log(`已加载章节 ${section.name} 的文本内容`);
          }
        } catch (error) {
          console.warn(`无法加载章节 ${section.name}:`, error);
        }
      }
      
      setAllSectionsText(sectionsText);
      setIsLoadingText(false);
    };

    loadAllSections();
  }, []);

  const searchInAllSections = (term: string): GlobalSearchResult[] => {
    if (!term.trim()) return [];
    
    const results: GlobalSearchResult[] = [];
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    
    // 搜索所有章节
    PDF_CONFIG.sections.forEach(section => {
      const sectionText = allSectionsText[section.filePath];
      if (!sectionText) return;
      
      // 模拟按页面分割文本（实际应该从PDF中提取）
      const pages = sectionText.split('--- 第 ');
      
      pages.forEach((pageContent, pageIndex) => {
        if (pageIndex === 0) return;
        
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
            context: context,
            sectionName: section.title || section.name,
            sectionPath: section.filePath,
            category: section.category || '其他'
          });
        }
      });
    });
    
    return results;
  };

  const handleSearch = useCallback(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      onSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    
    setTimeout(() => {
      const searchResults = searchInAllSections(searchTerm);
      setResults(searchResults);
      setHighlightIndex(0);
      onSearchResults(searchResults);
      setIsSearching(false);
    }, 100);
  }, [searchTerm, onSearchResults, searchInAllSections]);

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
      
      // 切换到对应章节
      if (onSectionChange) {
        onSectionChange(result.sectionPath);
      }
      
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
  }, [searchTerm, handleSearch]);

  return (
    <div className="space-y-4">
      {/* 全局搜索输入框 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="全局搜索所有PDF章节... (Ctrl+Enter 快速搜索)"
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
            disabled={isSearching || !searchTerm.trim() || isLoadingText}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isLoadingText ? '加载中...' : isSearching ? '搜索中...' : '全局搜索'}
          </button>
        </div>
        
        {isLoadingText ? (
          <div className="mt-2 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>正在加载文本内容... ({loadedSections}/{PDF_CONFIG.sections.length})</span>
            </div>
          </div>
        ) : searchTerm ? (
          <div className="mt-2 text-sm text-blue-600">
            <Globe className="h-4 w-4 inline mr-1" />
            将在所有 {PDF_CONFIG.sections.length} 个章节中搜索
          </div>
        ) : null}
      </div>

      {/* 全局搜索结果 */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                <Globe className="h-5 w-5 inline mr-2 text-blue-500" />
                全局搜索结果 ({results.length} 个匹配项)
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
                      <span className="text-xs text-gray-500">
                        {result.sectionName}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {result.category}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700">
                      ...{result.context}...
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Matched text: &quot;{result.text}&quot;
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
          <Globe className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">未找到匹配结果</h3>
          <p className="text-gray-500">
            No content containing &quot;{searchTerm}&quot; found in all sections, please try other keywords
          </p>
        </div>
      )}
    </div>
  );
}
