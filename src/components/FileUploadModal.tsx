'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import PDFUploader from './PDFUploader';
import { PDF_CONFIG } from '@/config/pdf';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  file: File;
  url: string;
  uploadTime: Date;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  isLargeFile?: boolean;
  fileSizeMB?: number;
}

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileUploaded: (file: UploadedFile) => void;
  onFileRemoved: (fileId: string) => void;
}

export default function FileUploadModal({ 
  isOpen, 
  onClose, 
  onFileUploaded, 
  onFileRemoved 
}: FileUploadModalProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // 检测移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 处理文件上传
  const handleFileUploaded = useCallback((file: UploadedFile) => {
    setUploadedFiles(prev => [...prev, file]);
    onFileUploaded(file);
  }, [onFileUploaded]);

  // 处理文件移除
  const handleFileRemoved = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
    onFileRemoved(fileId);
  }, [onFileRemoved]);

  // 打开文件选择器
  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
    // 清空input值，允许重复选择同一文件
    event.target.value = '';
  };

  // 处理文件上传
  const handleFileUpload = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);
    setIsUploading(true);

    for (const file of fileArray) {
      // 验证文件类型
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        const errorFile: UploadedFile = {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          size: file.size,
          file,
          url: '',
          uploadTime: new Date(),
          status: 'error',
          error: '只支持PDF格式的文件'
        };
        setUploadedFiles(prev => [...prev, errorFile]);
        continue;
      }

      // 检查文件大小警告（仅提示，不阻止上传）
      const warningSizeBytes = PDF_CONFIG.uploadConfig.sizeLimits.warning * 1024 * 1024;
      const isLargeFile = file.size > warningSizeBytes;

      const fileId = Date.now().toString() + Math.random();
      const uploadingFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        file,
        url: '',
        uploadTime: new Date(),
        status: 'uploading'
      };

      setUploadedFiles(prev => [...prev, uploadingFile]);

      try {
        // 创建文件URL
        const fileUrl = URL.createObjectURL(file);
        
        const successFile: UploadedFile = {
          ...uploadingFile,
          url: fileUrl,
          status: 'success'
        };

        // 如果是大文件，添加警告信息
        if (isLargeFile) {
          const fileSizeMB = Math.round(file.size / (1024 * 1024));
          console.warn(`大文件上传: ${file.name} (${fileSizeMB}MB)`);
          
          // 为大文件添加特殊标记
          successFile.isLargeFile = true;
          successFile.fileSizeMB = fileSizeMB;
        }

        setUploadedFiles(prev => 
          prev.map(f => f.id === fileId ? successFile : f)
        );

        // 调用父组件的回调
        onFileUploaded(successFile);

        // 保存到localStorage
        const userDocument = {
          id: fileId,
          name: file.name.replace(/\.pdf$/i, ''),
          originalName: file.name,
          size: file.size,
          url: fileUrl,
          uploadTime: new Date(),
          viewCount: 0,
          tags: []
        };

        const existingDocuments = JSON.parse(localStorage.getItem('user_documents') || '[]');
        existingDocuments.push(userDocument);
        localStorage.setItem('user_documents', JSON.stringify(existingDocuments));

      } catch (error) {
        const errorFile: UploadedFile = {
          ...uploadingFile,
          status: 'error',
          error: '文件上传失败'
        };
        setUploadedFiles(prev => 
          prev.map(f => f.id === fileId ? errorFile : f)
        );
      }
    }

    setIsUploading(false);
  }, [onFileUploaded]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 模态框内容 */}
      <div className="relative bg-background rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">上传文档</h2>
              <p className="text-sm text-muted-foreground">选择您的PDF文档进行上传</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* 统一的简洁界面 */}
          <div className="space-y-6">
            <div className="text-center">
              <div className="p-4 bg-primary/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                {isMobile ? '选择文件' : '拖拽文件到此处'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {isMobile ? '点击下方按钮选择PDF文件' : '或者点击下方按钮选择文件'}
              </p>
              <button
                onClick={openFilePicker}
                disabled={isUploading}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? '上传中...' : '选择文件'}
              </button>
            </div>
          </div>

          {/* 文件上传状态显示 */}
          {uploadedFiles.length > 0 && (
            <div className="mt-6 space-y-3">
              <h4 className="font-medium text-foreground">上传状态</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center space-x-3 p-3 bg-card border border-border rounded-lg"
                  >
                    <div className="flex-shrink-0">
                      {file.status === 'uploading' && (
                        <Loader2 className="h-5 w-5 text-primary animate-spin" />
                      )}
                      {file.status === 'success' && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {file.status === 'error' && (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {file.status === 'uploading' && '上传中...'}
                        {file.status === 'success' && (
                          <>
                            上传成功
                            {file.isLargeFile && (
                              <span className="ml-2 text-amber-600">
                                (大文件: {file.fileSizeMB}MB)
                              </span>
                            )}
                          </>
                        )}
                        {file.status === 'error' && file.error}
                      </p>
                    </div>
                    {file.status === 'error' && (
                      <button
                        onClick={() => handleFileRemoved(file.id)}
                        className="flex-shrink-0 p-1 hover:bg-muted rounded"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-between p-6 border-t border-border bg-muted/30">
          <div className="text-sm text-muted-foreground">
            支持 PDF 格式
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              取消
            </button>
            {uploadedFiles.length > 0 && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                完成
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
