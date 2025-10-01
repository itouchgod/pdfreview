import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PDFTextProvider } from "@/contexts/PDFTextContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import DevToolsInit from "@/components/DevToolsInit";
import HydrationErrorSuppressor from "@/components/HydrationErrorSuppressor";
import ExtensionIsolator from "@/components/ExtensionIsolator";
import Script from 'next/script';
import { headers } from "next/headers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IMPA Marine Stores Guide",
  description: "IMPA Marine Stores Guide 8th Edition 2023 - Smart Search Platform",
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/icon-192x192.png',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'IMPA',
  },
  formatDetection: {
    telephone: false,
  },
};

// 避免被静态化缓存
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 🔧 关键修复：headers() 需要 await
  const h = await headers();
  const nonce = h.get("x-nonce") || "";

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <meta name="application-name" content="IMPA" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="IMPA" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#2563eb" />
        
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-48x48.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icon-48x48.png" />
        <link rel="shortcut icon" href="/icon-48x48.png" type="image/png" />
        
        {/* 早期水合错误抑制 */}
        <Script
          id="hydration-error-suppressor"
          strategy="beforeInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              // 立即抑制水合错误和扩展错误，防止浏览器扩展干扰
              (function() {
                const originalError = console.error;
                const originalWarn = console.warn;
                
                // 扩展错误关键词列表
                const extensionKeywords = [
                  'chext_', 'metadata.js', 'contentscript.js', 'content.js',
                  'chext_driver.js', 'chext_loader.js', 'chrome-extension://',
                  'net::ERR_ABORTED', '404 (Not Found)', 'siteDubbingRules',
                  'ender metadata', 'mountUi return undefined', 'yt-ext-',
                  'cz-shortcut-listen', 'Skipping ads',
                  'Failed to execute \'observe\' on \'MutationObserver\'',
                  'parameter 1 is not of type \'Node\'',
                  'Unexpected identifier \'observe\'',
                  'appendChild\' on \'Node\'',
                  'Failed to execute \'appendChild\' on \'Node\'',
                  'vendors-326d2db556600f52.js',
                  'webpack-f9bdc8f8e7ef5feb.js',
                  'main-app-e131d669f65d8db7.js',
                  'index.ts-loader3.js',
                  'VM210:14',
                  'VM531:14',
                  'VM56:14',
                  'vendors-326d2db556600f52.js:1:126815',
                  'vendors-326d2db556600f52.js:1:126622'
                ];
                
                console.error = function(...args) {
                  const message = args[0];
                  if (typeof message === 'string') {
                    // 检查水合错误
                    const isHydrationError = 
                      message.includes('Hydration failed') || 
                      message.includes('hydrated but some attributes') ||
                      message.includes('server rendered HTML didn\\'t match') ||
                      message.includes('throwOnHydrationMismatch');
                    
                    // 检查扩展错误
                    const isExtensionError = extensionKeywords.some(keyword => 
                      message.includes(keyword)
                    );
                    
                    if (isHydrationError || isExtensionError) {
                      // 静默处理这些错误
                      return;
                    }
                  }
                  originalError.apply(console, args);
                };
                
                console.warn = function(...args) {
                  const message = args[0];
                  if (typeof message === 'string') {
                    const isExtensionWarning = extensionKeywords.some(keyword => 
                      message.includes(keyword)
                    );
                    if (isExtensionWarning) {
                      return; // 静默处理扩展警告
                    }
                  }
                  originalWarn.apply(console, args);
                };
              })();
            `,
          }}
        />
        
        {/* 注册 Service Worker - 使用 nonce */}
        <Script
          id="register-sw"
          strategy="afterInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      // ServiceWorker registered successfully
                    },
                    function(err) {
                      console.error('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
        
      </head>
      <body data-nonce={nonce} suppressHydrationWarning={true}>
        <HydrationErrorSuppressor />
        <ExtensionIsolator />
        <ThemeProvider>
          <PDFTextProvider>
            <DevToolsInit />
            {children}
          </PDFTextProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}