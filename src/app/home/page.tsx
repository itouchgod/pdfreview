'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import Image from 'next/image';
import { usePDFText } from '@/contexts/PDFTextContext';
import ThemeToggle from '@/components/ThemeToggle';

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { loadingStatus, startLoading, isReady, hasStartedLoading } = usePDFText();

  // 处理客户端挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 页面加载时开始加载PDF文本（只在首次访问时）
  useEffect(() => {
    if (!hasStartedLoading) {
      startLoading();
    }
  }, [hasStartedLoading, startLoading]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const handleKeywordClick = (keyword: string) => {
    router.push(`/search?q=${encodeURIComponent(keyword)}`);
  };

  const commonKeywords = [
    'safety', 'equipment', 'tools', 'valves', 'pipes', 'electrical',
    'marine', 'deck', 'engine', 'pump', 'cable', 'rope', 'paint',
    'anchor', 'winch', 'chain', 'wire', 'hose', 'coupling', 'fitting',
    'bearing', 'seal', 'gasket', 'bolt', 'nut', 'screw', 'washer'
  ];

  // 如果还没有挂载，返回一个加载状态
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-muted rounded mb-4"></div>
          <div className="h-12 w-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 主题切换按钮 - 右上角 */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-4xl">
          {/* Logo and Search Box */}
          <div className="mb-12">
            <form onSubmit={handleSearch} className="relative max-w-3xl mx-auto">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 w-8 h-8 relative">
                  <Image 
                    src="/brand-icon.svg" 
                    alt="IMPA Logo" 
                    fill
                    sizes="32px"
                    className="object-contain"
                    priority
                    unoptimized
                  />
                </div>
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search name, code..."
                    className="w-full pl-6 pr-24 py-4 text-lg bg-card rounded-full border border-border focus:outline-none focus:shadow-lg focus:border-primary transition-all duration-200 hover:shadow-md text-card-foreground placeholder:text-muted-foreground"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                    {/* 清除按钮 */}
                    {searchTerm && (
                      <>
                        <button
                          type="button"
                          onClick={() => setSearchTerm('')}
                          className="p-2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        {/* 分隔线 */}
                        <div className="h-6 w-px bg-border"></div>
                      </>
                    )}
                    {/* 搜索按钮 */}
                    <button
                      type="submit"
                      className="p-2 text-muted-foreground hover:text-primary transition-all duration-200"
                    >
                      <Search className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Common Keywords */}
          <div className="text-center">
            <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
              {commonKeywords.map((keyword, index) => (
                <button
                  key={index}
                  onClick={() => handleKeywordClick(keyword)}
                  className="px-4 py-2 text-sm bg-secondary hover:bg-primary/10 hover:text-primary text-muted-foreground rounded-full transition-colors border border-border hover:border-primary/50"
                >
                  {keyword}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Loading Progress - 放在页脚上边框 */}
      {loadingStatus.isLoading && !isReady && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg">
          <div className="max-w-md mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-card-foreground">
                {loadingStatus.currentSection ? `加载章节: ${loadingStatus.currentSection}` : '准备加载...'}
              </span>
              <span className="text-sm text-muted-foreground">
                {loadingStatus.loadedSections} / {loadingStatus.totalSections}
              </span>
            </div>
            <div className="bg-muted rounded-full h-2 overflow-hidden">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${loadingStatus.progress}%` }}
              ></div>
            </div>
            {loadingStatus.error && (
              <p className="mt-2 text-xs text-destructive">
                {loadingStatus.error}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto py-4 sm:py-6 text-center border-t border-border">
        <div className="max-w-4xl mx-auto px-4">
          {/* 桌面端显示完整信息 */}
          <div className="hidden sm:flex justify-center items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-5 relative">
                <Image 
                  src="/brand-icon.svg" 
                  alt="IMPA Logo" 
                  fill
                  sizes="16px"
                  className="object-contain"
                />
              </div>
              <span>Marine Stores Guide</span>
            </div>
            <span>•</span>
            <span>8th Edition 2023</span>
            <span>•</span>
            <span>Internal Use Only</span>
          </div>
          
          {/* 手机端显示简洁信息 */}
          <div className="sm:hidden flex flex-col items-center space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-4 relative">
                <Image 
                  src="/brand-icon.svg" 
                  alt="IMPA Logo" 
                  fill
                  sizes="12px"
                  className="object-contain"
                />
              </div>
              <span className="font-medium">IMPA Guide 2023</span>
            </div>
            <div className="text-muted-foreground/70">
              Internal Use Only
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}