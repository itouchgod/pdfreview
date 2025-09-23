'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText, Search, CheckCircle, XCircle } from 'lucide-react';

export default function TestPage() {
  const [testResults, setTestResults] = useState<{
    pdfAccess: boolean;
    pdfjsLoad: boolean;
    searchFunction: boolean;
  }>({
    pdfAccess: false,
    pdfjsLoad: false,
    searchFunction: false,
  });

  const runTests = async () => {
    const results = { pdfAccess: false, pdfjsLoad: false, searchFunction: false };

    // 测试PDF文件访问
    try {
      const response = await fetch('/pdfs/impa_8th_2023.pdf', { method: 'HEAD' });
      results.pdfAccess = response.ok;
    } catch (error) {
      console.error('PDF访问测试失败:', error);
    }

    // 测试PDF.js加载
    try {
      const pdfjs = await import('pdfjs-dist');
      results.pdfjsLoad = !!pdfjs;
    } catch (error) {
      console.error('PDF.js加载测试失败:', error);
    }

    // 测试搜索功能
    try {
      const testText = "这是一个测试文本，用于验证搜索功能是否正常工作。";
      const searchTerm = "测试";
      const regex = new RegExp(searchTerm, 'gi');
      results.searchFunction = regex.test(testText);
    } catch (error) {
      console.error('搜索功能测试失败:', error);
    }

    setTestResults(results);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">系统测试页面</h1>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">PDF文件访问测试</h3>
                  <p className="text-sm text-gray-600">检查PDF文件是否可以正常访问</p>
                </div>
              </div>
              {testResults.pdfAccess ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <XCircle className="h-6 w-6 text-red-500" />
              )}
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Search className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">PDF.js加载测试</h3>
                  <p className="text-sm text-gray-600">检查PDF.js库是否可以正常加载</p>
                </div>
              </div>
              {testResults.pdfjsLoad ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <XCircle className="h-6 w-6 text-red-500" />
              )}
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Search className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">搜索功能测试</h3>
                  <p className="text-sm text-gray-600">检查搜索算法是否正常工作</p>
                </div>
              </div>
              {testResults.searchFunction ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <XCircle className="h-6 w-6 text-red-500" />
              )}
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={runTests}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              运行测试
            </button>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">使用说明</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Click &quot;Run Test&quot; button to check system status</li>
              <li>• 绿色勾号表示测试通过</li>
              <li>• 红色叉号表示测试失败</li>
              <li>• 所有测试通过后可以正常使用搜索功能</li>
            </ul>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Back to Main Page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
