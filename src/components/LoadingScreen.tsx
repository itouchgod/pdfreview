'use client';

import React from 'react';
import Image from 'next/image';
import { usePDFText } from '@/contexts/PDFTextContext';

interface LoadingScreenProps {
  className?: string;
}

export default function LoadingScreen({ className = '' }: LoadingScreenProps) {
  const { loadingStatus } = usePDFText();

  return (
    <div className={`min-h-screen bg-gradient-to-br from-background via-background to-muted/5 flex flex-col items-center justify-center px-6 relative overflow-hidden ${className}`}>
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* 主要内容区域 */}
      <div className="w-full max-w-lg mx-auto text-center relative z-10">
        {/* 加载文字 */}
        <div className="mb-12">
          <div className="inline-flex items-center space-x-3">
            <div className="w-8 h-8 relative">
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
            <h2 className="text-lg font-normal text-foreground/80 tracking-wide">
              Loading IMPA data...
            </h2>
          </div>
        </div>

        {/* 进度条容器 */}
        <div className="relative mb-10">
          {/* 背景进度条 */}
          <div className="w-full h-3 bg-muted/30 rounded-full overflow-hidden shadow-inner border border-muted/20 backdrop-blur-sm">
            {/* 进度条填充 */}
            <div 
              className="h-full bg-gradient-to-r from-primary via-primary/90 to-primary/80 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
              style={{ width: `${loadingStatus.progress}%` }}
            >
              {/* 进度条内部光效 */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full animate-pulse" />
              {/* 进度条顶部高光 */}
              <div className="absolute top-0 left-0 right-0 h-px bg-white/50 rounded-full" />
              {/* 流动光效 */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full animate-pulse" style={{ animationDuration: '2s' }} />
            </div>
          </div>
          
          {/* 移动的IMPA logo - 独立定位 */}
          <div 
            className="absolute -top-3 w-8 h-8 transition-all duration-1000 ease-out z-20"
            style={{ 
              left: `calc(${Math.max(4, Math.min(loadingStatus.progress, 96))}% - 16px)`,
              opacity: loadingStatus.progress > 0 ? 1 : 0
            }}
          >
            <div className="w-full h-full bg-background rounded-full shadow-2xl border-2 border-primary/60 flex items-center justify-center hover:scale-110 transition-all duration-300 relative">
              {/* Logo背景光效 */}
              <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping" />
              <div className="w-5 h-5 relative z-10">
                <Image 
                  src="/brand-icon.svg" 
                  alt="IMPA Logo" 
                  fill
                  sizes="20px"
                  className="object-contain"
                  priority
                  unoptimized
                />
              </div>
            </div>
          </div>
          
          {/* 进度条外部发光效果 */}
          <div 
            className="absolute top-0 h-3 bg-gradient-to-r from-transparent via-primary/20 to-transparent rounded-full transition-all duration-1000 ease-out blur-sm"
            style={{ width: `${loadingStatus.progress}%` }}
          />
        </div>

        {/* 加载状态指示器 */}
        <div className="flex items-center justify-center space-x-2 mb-8">
          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>

        {/* 错误信息 */}
        {loadingStatus.error && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-xl backdrop-blur-sm">
            <p className="text-sm text-destructive">
              {loadingStatus.error}
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
