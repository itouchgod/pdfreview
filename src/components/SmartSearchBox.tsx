'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X, FileText, Globe, Zap } from 'lucide-react';
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
  // Highlight functionality removed
  currentSection?: string;
}

export default function SmartSearchBox({ onSearchResults, onClearSearch, onPageJump, onSectionChange, currentSection }: SmartSearchBoxProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SmartSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [searchMode, setSearchMode] = useState<'current' | 'global'>('global');
  const [allSectionsText, setAllSectionsText] = useState<Record<string, string>>({});
  const [isLoadingText, setIsLoadingText] = useState(true);
  const [loadedSections, setLoadedSections] = useState(0);

  // Common search keywords
  const commonKeywords = [
    'safety', 'equipment', 'tools', 'valves', 'pipes', 'electrical',
    'marine', 'deck', 'engine', 'pump', 'cable', 'rope', 'paint'
  ];

  // Load text content from all sections
  useEffect(() => {
    const loadAllSections = async () => {
      const sectionsText: Record<string, string> = {};
      
      // Dynamically import PDF.js
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
          }
        } catch (error) {
          console.warn(`Failed to load section ${section.name}:`, error);
        }
      }
      
      setAllSectionsText(sectionsText);
      setIsLoadingText(false);
    };

    loadAllSections();
  }, []);

  const searchInAllSections = (term: string): SmartSearchResult[] => {
    if (!term.trim()) return [];
    
    const results: SmartSearchResult[] = [];
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    
    // 搜索所有章节
    PDF_CONFIG.sections.forEach(section => {
      const sectionText = allSectionsText[section.filePath];
      if (!sectionText) return;
      
      // 按页面分割文本
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

  const searchInCurrentSection = (term: string): SmartSearchResult[] => {
    if (!term.trim() || !currentSection) return [];
    
    const results: SmartSearchResult[] = [];
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    
    const currentSectionData = PDF_CONFIG.sections.find(s => s.name === currentSection);
    if (!currentSectionData) return [];
    
    const sectionText = allSectionsText[currentSectionData.filePath];
    if (!sectionText) return [];
    
    // 按页面分割文本
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
          sectionName: currentSectionData.title || currentSectionData.name,
          sectionPath: currentSectionData.filePath,
          category: currentSectionData.category || '其他'
        });
      }
    });
    
    return results;
  };

  const handleSearch = useCallback(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      onSearchResults([]);
      // Highlight functionality removed
      return;
    }
    
    setIsSearching(true);
    
    // Set highlight text
    // Highlight functionality removed
    
    setTimeout(() => {
      const searchResults = searchMode === 'global' 
        ? searchInAllSections(searchTerm)
        : searchInCurrentSection(searchTerm);
      
      setResults(searchResults);
      setHighlightIndex(0);
      onSearchResults(searchResults);
      setIsSearching(false);
    }, 100);
  }, [searchTerm, searchMode, onSearchResults, searchInAllSections, searchInCurrentSection]);

  const handleClear = () => {
    setSearchTerm('');
    setResults([]);
    setHighlightIndex(0);
    onSearchResults([]);
    // Highlight functionality removed
    onClearSearch();
  };

  const handleKeywordClick = (keyword: string) => {
    setSearchTerm(keyword);
    // Auto search
    setTimeout(() => {
      handleSearch();
    }, 100);
  };

  const goToResult = (index: number) => {
    if (index >= 0 && index < results.length) {
      setHighlightIndex(index);
      const result = results[index];
      
      // Switch to corresponding section
      if (onSectionChange && result.sectionPath !== currentSection) {
        onSectionChange(result.sectionPath);
        
        // If section is switched, delay page jump to wait for PDF loading
        setTimeout(() => {
          if (onPageJump) {
            onPageJump(result.page);
          }
        }, 1000); // 1 second delay to ensure PDF is loaded
      } else {
        // If no section change needed, jump to page directly
        if (onPageJump) {
          onPageJump(result.page);
        }
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
  }, [searchTerm, searchMode, handleSearch]);

  return (
    <div className="space-y-4">
      {/* Search Mode Toggle */}
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setSearchMode('current')}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            searchMode === 'current'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Search className="h-4 w-4 inline mr-1" />
          Current Section
        </button>
        <button
          onClick={() => setSearchMode('global')}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            searchMode === 'global'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Globe className="h-4 w-4 inline mr-1" />
          Global Search
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            {searchMode === 'global' ? (
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-500" />
            ) : (
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-500" />
            )}
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={searchMode === 'global' 
                ? `Search in all ${PDF_CONFIG.sections.length} sections... (Ctrl+Enter for quick search)`
                : `Search in ${currentSection}... (Ctrl+Enter for quick search)`
              }
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
            {isLoadingText ? 'Loading...' : isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
        
        {/* Loading Status */}
        {isLoadingText && (
          <div className="mt-2 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Loading text content... ({loadedSections}/{PDF_CONFIG.sections.length})</span>
            </div>
          </div>
        )}
      </div>

      {/* Common Search Keywords */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="text-sm font-medium text-gray-900 mb-3 flex items-center">
          <Zap className="h-4 w-4 mr-2 text-yellow-500" />
          Quick Search
        </div>
        <div className="flex flex-wrap gap-2">
          {commonKeywords.map((keyword) => (
            <button
              key={keyword}
              onClick={() => handleKeywordClick(keyword)}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-blue-100 hover:text-blue-700 text-gray-700 rounded-full transition-colors"
            >
              {keyword}
            </button>
          ))}
        </div>
      </div>

      {/* Search Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                {searchMode === 'global' ? (
                  <>
                    <Globe className="h-5 w-5 inline mr-2 text-blue-500" />
                    Global Search Results ({results.length} matches)
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5 inline mr-2 text-blue-500" />
                    Search Results ({results.length} matches)
                  </>
                )}
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => goToResult(highlightIndex - 1)}
                  disabled={highlightIndex <= 0}
                  className="px-2 py-1 text-sm bg-gray-100 text-gray-700 rounded disabled:bg-gray-50 disabled:text-gray-400"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  {highlightIndex + 1} / {results.length}
                </span>
                <button
                  onClick={() => goToResult(highlightIndex + 1)}
                  disabled={highlightIndex >= results.length - 1}
                  className="px-2 py-1 text-sm bg-gray-100 text-gray-700 rounded disabled:bg-gray-50 disabled:text-gray-400"
                >
                  Next
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
                        Page {result.page}
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

      {/* No Results Message */}
      {searchTerm && results.length === 0 && !isSearching && !isLoadingText && (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          {searchMode === 'global' ? (
            <Globe className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          ) : (
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          )}
          <h3 className="text-lg font-medium text-gray-600 mb-2">No matching results found</h3>
          <p className="text-gray-500">
            {searchMode === 'global' 
              ? `No content containing "${searchTerm}" found in all sections, please try other keywords`
              : `No content containing "${searchTerm}" found in current section, please try other keywords or switch to global search`
            }
          </p>
        </div>
      )}
    </div>
  );
}
