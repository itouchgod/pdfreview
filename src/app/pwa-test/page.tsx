'use client';

import { useEffect, useState } from 'react';

export default function PWATestPage() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 检测PWA安装提示
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          PWA 功能测试页面
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📱 移动端安装测试</h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-primary/10 rounded-lg">
              <h3 className="font-medium text-primary mb-2">iPhone (Safari)</h3>
              <p className="text-primary/80 text-sm">
                1. 在Safari中打开此页面<br/>
                2. 点击底部分享按钮<br/>
                3. 选择&quot;添加到主屏幕&quot;<br/>
                4. 确认安装
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">Android (Chrome)</h3>
              <p className="text-green-700 text-sm">
                1. 在Chrome中打开此页面<br/>
                2. 地址栏右侧会出现安装图标<br/>
                3. 点击安装图标<br/>
                4. 确认安装
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">🔧 PWA 配置检查</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Manifest 文件</h3>
              <p className="text-sm text-gray-600">
                ✅ manifest.json 已配置<br/>
                ✅ 应用名称: IMPA<br/>
                ✅ 图标: 192x192, 512x512<br/>
                ✅ 主题色: #2563eb
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">图标文件</h3>
              <p className="text-sm text-gray-600">
                ✅ apple-touch-icon.png<br/>
                ✅ icon-192x192.png<br/>
                ✅ icon-512x512.png<br/>
                ✅ 其他尺寸图标
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">🚀 安装状态</h2>
          
          {isInstallable ? (
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-green-700 mb-4">
                ✅ 您的浏览器支持PWA安装！
              </p>
              <button
                onClick={handleInstallClick}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                立即安装应用
              </button>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-yellow-700">
                ℹ️ 请使用支持的浏览器访问此页面以测试PWA安装功能
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
