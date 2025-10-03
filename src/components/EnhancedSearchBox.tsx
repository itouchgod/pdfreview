'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Search, 
  X, 
  History, 
  Settings
} from 'lucide-react';

interface SearchHistory {
  id: string;
  query: string;
  timestamp: Date;
  resultCount: number;
}

interface SearchFilter {
  documentTypes: string[];
  dateRange: {
    start?: Date;
    end?: Date;
  };
  fileSize: {
    min?: number;
    max?: number;
  };
  tags: string[];
}

interface EnhancedSearchBoxProps {
  onSearch: (query: string, filters?: SearchFilter) => void;
  onClear: () => void;
  placeholder?: string;
  className?: string;
  showAdvancedOptions?: boolean;
  searchHistory?: SearchHistory[];
  onHistorySelect?: (query: string) => void;
  onClearHistory?: () => void;
}

export default function EnhancedSearchBox({
  onSearch,
  onClear,
  placeholder = "搜索文档内容...",
  className = "",
  showAdvancedOptions = true,
  onHistorySelect,
  onClearHistory
}: EnhancedSearchBoxProps) {
  const [query, setQuery] = useState('');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [filters, setFilters] = useState<SearchFilter>({
    documentTypes: [],
    dateRange: {},
    fileSize: {},
    tags: []
  });
  const [recentSearches, setRecentSearches] = useState<SearchHistory[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // 加载搜索历史
  useEffect(() => {
    const savedHistory = localStorage.getItem('search_history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        const historyWithDates = parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        setRecentSearches(historyWithDates.slice(0, 10)); // 只显示最近10条
      } catch (error) {
        console.error('Failed to load search history:', error);
      }
    }
  }, []);

  // 保存搜索历史
  const saveSearchHistory = useCallback((searchQuery: string, resultCount: number = 0) => {
    if (!searchQuery.trim()) return;
    
    const newHistory: SearchHistory = {
      id: Date.now().toString(),
      query: searchQuery.trim(),
      timestamp: new Date(),
      resultCount
    };

    const updatedHistory = [
      newHistory,
      ...recentSearches.filter(item => item.query !== searchQuery.trim())
    ].slice(0, 20); // 最多保存20条历史

    setRecentSearches(updatedHistory);
    localStorage.setItem('search_history', JSON.stringify(updatedHistory));
  }, [recentSearches]);

  // 处理搜索
  const handleSearch = useCallback((searchQuery: string = query) => {
    if (!searchQuery.trim()) return;
    
    saveSearchHistory(searchQuery);
    onSearch(searchQuery, filters);
    setShowHistory(false);
    setShowSuggestions(false);
  }, [query, filters, onSearch, saveSearchHistory]);

  // 处理输入变化
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    // 显示建议
    if (value.trim()) {
      const matchingHistory = recentSearches
        .filter(item => item.query.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 5)
        .map(item => item.query);
      setSuggestions(matchingHistory);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [recentSearches]);

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowHistory(false);
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  }, [handleSearch]);

  // 处理建议选择
  const handleSuggestionSelect = useCallback((suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    handleSearch(suggestion);
  }, [handleSearch]);

  // 处理历史选择
  const handleHistorySelect = useCallback((historyItem: SearchHistory) => {
    setQuery(historyItem.query);
    setShowHistory(false);
    onHistorySelect?.(historyItem.query);
    handleSearch(historyItem.query);
  }, [onHistorySelect, handleSearch]);

  // 清除搜索
  const handleClear = useCallback(() => {
    setQuery('');
    setShowHistory(false);
    setShowSuggestions(false);
    onClear();
    inputRef.current?.focus();
  }, [onClear]);

  // 清除历史
  const handleClearHistory = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem('search_history');
    onClearHistory?.();
  }, [onClearHistory]);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setShowHistory(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 格式化日期
  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className={`relative ${className}`}>
      {/* 主搜索框 */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          <Search className="h-5 w-5 text-muted-foreground" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (recentSearches.length > 0) {
              setShowHistory(true);
            }
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-20 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {query && (
            <button
              onClick={handleClear}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              title="清除搜索"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          
          {showAdvancedOptions && (
            <button
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className={`p-1 transition-colors ${
                isAdvancedOpen 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="高级搜索选项"
            >
              <Settings className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* 高级搜索选项 */}
      {showAdvancedOptions && isAdvancedOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-card border border-border rounded-lg shadow-lg z-50">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">高级搜索选项</h3>
            
            {/* 文档类型过滤 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                文档类型
              </label>
              <div className="flex flex-wrap gap-2">
                {['PDF', 'Word', 'Excel', 'PowerPoint'].map(type => (
                  <label key={type} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.documentTypes.includes(type)}
                      onChange={(e) => {
                        const newTypes = e.target.checked
                          ? [...filters.documentTypes, type]
                          : filters.documentTypes.filter(t => t !== type);
                        setFilters(prev => ({ ...prev, documentTypes: newTypes }));
                      }}
                      className="rounded border-border"
                    />
                    <span className="text-sm text-foreground">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 文件大小过滤 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                文件大小
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  placeholder="最小 (MB)"
                  value={filters.fileSize.min || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    fileSize: { ...prev.fileSize, min: e.target.value ? Number(e.target.value) : undefined }
                  }))}
                  className="flex-1 px-3 py-2 border border-border rounded bg-background text-foreground"
                />
                <span className="text-muted-foreground">-</span>
                <input
                  type="number"
                  placeholder="最大 (MB)"
                  value={filters.fileSize.max || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    fileSize: { ...prev.fileSize, max: e.target.value ? Number(e.target.value) : undefined }
                  }))}
                  className="flex-1 px-3 py-2 border border-border rounded bg-background text-foreground"
                />
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setFilters({
                  documentTypes: [],
                  dateRange: {},
                  fileSize: {},
                  tags: []
                })}
                className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                重置
              </button>
              <button
                onClick={() => handleSearch()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                搜索
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 搜索建议 */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-40"
        >
          <div className="p-2">
            <div className="text-xs text-muted-foreground mb-2 px-2">搜索建议</div>
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionSelect(suggestion)}
                className="w-full text-left px-2 py-2 text-sm text-foreground hover:bg-muted rounded transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 搜索历史 */}
      {showHistory && recentSearches.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-40"
        >
          <div className="p-2">
            <div className="flex items-center justify-between mb-2 px-2">
              <div className="text-xs text-muted-foreground flex items-center space-x-1">
                <History className="h-3 w-3" />
                <span>搜索历史</span>
              </div>
              <button
                onClick={handleClearHistory}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                清除历史
              </button>
            </div>
            {recentSearches.slice(0, 5).map((historyItem) => (
              <button
                key={historyItem.id}
                onClick={() => handleHistorySelect(historyItem)}
                className="w-full text-left px-2 py-2 text-sm text-foreground hover:bg-muted rounded transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{historyItem.query}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {formatDate(historyItem.timestamp)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
