'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { usePDFText } from '@/contexts/PDFTextContext';

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const { loadingStatus, startLoading, isReady, hasStartedLoading } = usePDFText();

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

  return (
    <div className="min-h-screen bg-white flex flex-col px-4">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-2xl">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-light text-gray-900">
              IMPA Marine Stores Guide
            </h1>
          </div>

          {/* Search Box - Google Style */}
          <div className="mb-8">
            <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
              <div className="flex items-center space-x-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search marine equipment, tools, supplies..."
                    className="w-full pl-12 pr-4 py-3 text-base bg-white rounded-full border border-gray-200 focus:outline-none focus:shadow-lg focus:border-transparent transition-all duration-200 hover:shadow-md"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 hover:shadow-md transition-all duration-200 border border-transparent text-sm whitespace-nowrap"
                >
                  IMPA Search
                </button>
              </div>
            </form>
          </div>

          {/* Loading Progress */}
          {loadingStatus.isLoading && !isReady && (
            <div className="mb-8 w-full max-w-md mx-auto">
              <div className="bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${loadingStatus.progress}%` }}
                ></div>
              </div>
              <p className="text-center text-sm text-gray-600">
                Loading IMPA data... {Math.round(loadingStatus.progress)}%
              </p>
            </div>
          )}


          {/* Common Keywords */}
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-4">Common keywords:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {commonKeywords.map((keyword, index) => (
                <button
                  key={index}
                  onClick={() => handleKeywordClick(keyword)}
                  className="px-3 py-1 text-xs bg-gray-50 hover:bg-blue-50 hover:text-blue-600 text-gray-600 rounded-full transition-colors border border-gray-200"
                >
                  {keyword}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto p-4 text-center text-sm text-gray-500 border-t border-gray-200">
        <div className="flex justify-center items-center space-x-4">
          <span>IMPA Marine Stores Guide</span>
          <span>•</span>
          <span>8th Edition 2023</span>
          <span>•</span>
          <span>Internal Use Only</span>
        </div>
      </footer>
    </div>
  );
}
