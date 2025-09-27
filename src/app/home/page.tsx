'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import Image from 'next/image';
import { usePDFText } from '@/contexts/PDFTextContext';

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
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-12 w-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
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
                    className="w-full pl-6 pr-24 py-4 text-lg bg-white rounded-full border border-gray-300 focus:outline-none focus:shadow-lg focus:border-transparent transition-all duration-200 hover:shadow-md"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                    {/* 清除按钮 */}
                    {searchTerm && (
                      <>
                        <button
                          type="button"
                          onClick={() => setSearchTerm('')}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        {/* 分隔线 */}
                        <div className="h-6 w-px bg-gray-200"></div>
                      </>
                    )}
                    {/* 搜索按钮 */}
                    <button
                      type="submit"
                      className="p-2 text-gray-500 hover:text-gray-700 transition-all duration-200"
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
                  className="px-4 py-2 text-sm bg-gray-50 hover:bg-blue-50 hover:text-blue-600 text-gray-600 rounded-full transition-colors border border-gray-200 hover:border-blue-200"
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
        <div className="w-full px-4 py-2 bg-gray-50 border-t border-gray-200">
          <div className="max-w-md mx-auto">
            <div className="bg-gray-200 rounded-full h-2 mb-1">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${loadingStatus.progress}%` }}
              ></div>
            </div>
            <p className="text-center text-xs text-gray-600">
              Loading IMPA data... {Math.round(loadingStatus.progress)}%
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto py-6 text-center text-sm text-gray-500 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-center items-center space-x-4">
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
        </div>
      </footer>
    </div>
  );
}
