import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PDFTextProvider } from "@/contexts/PDFTextContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import DevToolsInit from "@/components/DevToolsInit";
import HydrationErrorSuppressor from "@/components/HydrationErrorSuppressor";
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
              // 立即抑制水合错误，防止浏览器扩展干扰
              (function() {
                const originalError = console.error;
                console.error = function(...args) {
                  const message = args[0];
                  if (typeof message === 'string' && 
                      (message.includes('Hydration failed') || 
                       message.includes('hydrated but some attributes') ||
                       message.includes('server rendered HTML didn\\'t match') ||
                       message.includes('throwOnHydrationMismatch'))) {
                    // 静默处理水合错误
                    return;
                  }
                  originalError.apply(console, args);
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