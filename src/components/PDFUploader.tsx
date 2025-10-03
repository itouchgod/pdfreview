'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  file: File;
  url: string;
  uploadTime: Date;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

interface PDFUploaderProps {
  onFileUploaded: (file: UploadedFile) => void;
  onFileRemoved: (fileId: string) => void;
  maxFileSize?: number; // MB
  acceptedTypes?: string[];
  className?: string;
}

export default function PDFUploader({
  onFileUploaded,
  onFileRemoved,
  maxFileSize = 50, // 默认50MB
  acceptedTypes = ['.pdf'],
  className = ''
}: PDFUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 验证文件
  const validateFile = useCallback((file: File): string | null => {
    // 检查文件类型
    if (!acceptedTypes.some(type => file.name.toLowerCase().endsWith(type.toLowerCase()))) {
      return `不支持的文件类型。支持的格式：${acceptedTypes.join(', ')}`;
    }

    // 检查文件大小
    const maxSizeBytes = maxFileSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `文件大小超过限制。最大允许：${maxFileSize}MB`;
    }

    return null;
  }, [acceptedTypes, maxFileSize]);

  // 处理文件上传
  const handleFileUpload = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);
    setIsUploading(true);

    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        const errorFile: UploadedFile = {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          size: file.size,
          file,
          url: '',
          uploadTime: new Date(),
          status: 'error',
          error: validationError
        };
        setUploadedFiles(prev => [...prev, errorFile]);
        continue;
      }

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

        setUploadedFiles(prev => 
          prev.map(f => f.id === fileId ? successFile : f)
        );

        onFileUploaded(successFile);
      } catch (error) {
        const errorFile: UploadedFile = {
          ...uploadingFile,
          status: 'error',
          error: error instanceof Error ? error.message : '上传失败'
        };

        setUploadedFiles(prev => 
          prev.map(f => f.id === fileId ? errorFile : f)
        );
      }
    }

    setIsUploading(false);
  }, [validateFile, onFileUploaded]);

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  // 文件选择处理
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
    // 重置input值，允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileUpload]);

  // 移除文件
  const handleRemoveFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file && file.url) {
        URL.revokeObjectURL(file.url);
      }
      return prev.filter(f => f.id !== fileId);
    });
    onFileRemoved(fileId);
  }, [onFileRemoved]);

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`w-full ${className}`}>
      {/* 上传区域 */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${isDragOver 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50 hover:bg-muted/50'
          }
          ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          multiple
          className="hidden"
        />
        
        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 rounded-full bg-primary/10">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          
          <div>
            <p className="text-lg font-medium text-foreground">
              拖拽PDF文件到此处，或点击选择文件
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              支持 {acceptedTypes.join(', ')} 格式，最大 {maxFileSize}MB
            </p>
          </div>
          
          {isUploading && (
            <div className="flex items-center space-x-2 text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">正在上传...</span>
            </div>
          )}
        </div>
      </div>

      {/* 已上传文件列表 */}
      {uploadedFiles.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-lg font-medium text-foreground">已上传文件</h3>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-card rounded-lg border border-border"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} • {file.uploadTime.toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {file.status === 'uploading' && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  {file.status === 'success' && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  
                  <button
                    onClick={() => handleRemoveFile(file.id)}
                    className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                    title="移除文件"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
