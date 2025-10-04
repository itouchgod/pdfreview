'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Search, 
  Trash2, 
  Edit3, 
  Eye, 
  Calendar,
  HardDrive
} from 'lucide-react';
import Link from 'next/link';

interface UserDocument {
  id: string;
  name: string;
  originalName: string;
  size: number;
  url: string;
  uploadTime: Date;
  lastViewed?: Date;
  viewCount: number;
  category?: string;
  tags: string[];
}

interface UserDocumentManagerProps {
  onDocumentSelect: (document: UserDocument) => void;
  className?: string;
  showTitle?: boolean;
  compact?: boolean;
  refreshTrigger?: number;
}

export default function UserDocumentManager({ 
  onDocumentSelect, 
  className = '',
  showTitle = false,
  compact = false,
  refreshTrigger = 0
}: UserDocumentManagerProps) {
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<UserDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'uploadTime' | 'lastViewed' | 'size'>('uploadTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [editingDocument, setEditingDocument] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showAllDocuments, setShowAllDocuments] = useState(false);

  // 从localStorage加载文档
  const loadDocuments = useCallback(() => {
    const savedDocuments = localStorage.getItem('user_documents');
    if (savedDocuments) {
      try {
        const parsed = JSON.parse(savedDocuments);
        const documentsWithDates = parsed.map((doc: any) => ({
          ...doc,
          uploadTime: new Date(doc.uploadTime),
          lastViewed: doc.lastViewed ? new Date(doc.lastViewed) : undefined
        }));
        setDocuments(documentsWithDates);
      } catch (error) {
        console.error('Failed to load user documents:', error);
      }
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // 监听刷新触发器
  useEffect(() => {
    if (refreshTrigger > 0) {
      loadDocuments();
    }
  }, [refreshTrigger, loadDocuments]);

  // 添加事件监听器
  useEffect(() => {
    const handleExpandDocuments = () => {
      setShowAllDocuments(true);
    };

    window.addEventListener('expandDocuments', handleExpandDocuments);

    return () => {
      window.removeEventListener('expandDocuments', handleExpandDocuments);
    };
  }, []);

  // 保存文档到localStorage
  const saveDocuments = useCallback((docs: UserDocument[]) => {
    localStorage.setItem('user_documents', JSON.stringify(docs));
  }, []);

  // 处理文件上传
  const handleFileUploaded = useCallback((uploadedFile: any) => {
    const newDocument: UserDocument = {
      id: uploadedFile.id,
      name: uploadedFile.name.replace(/\.pdf$/i, ''), // 移除.pdf扩展名
      originalName: uploadedFile.name,
      size: uploadedFile.size,
      url: uploadedFile.url,
      uploadTime: uploadedFile.uploadTime,
      viewCount: 0,
      tags: []
    };

    const updatedDocuments = [...documents, newDocument];
    setDocuments(updatedDocuments);
    saveDocuments(updatedDocuments);
  }, [documents, saveDocuments]);

  // 处理文件移除
  const handleFileRemoved = useCallback((fileId: string) => {
    const updatedDocuments = documents.filter(doc => doc.id !== fileId);
    setDocuments(updatedDocuments);
    saveDocuments(updatedDocuments);
  }, [documents, saveDocuments]);

  // 删除文档
  const handleDeleteDocument = useCallback((documentId: string) => {
    if (confirm('确定要删除这个文档吗？此操作无法撤销。')) {
      const document = documents.find(doc => doc.id === documentId);
      if (document && document.url) {
        URL.revokeObjectURL(document.url);
      }
      
      const updatedDocuments = documents.filter(doc => doc.id !== documentId);
      setDocuments(updatedDocuments);
      saveDocuments(updatedDocuments);
    }
  }, [documents, saveDocuments]);

  // 开始编辑文档名称
  const handleStartEdit = useCallback((document: UserDocument) => {
    setEditingDocument(document.id);
    setEditingName(document.name);
  }, []);

  // 保存编辑
  const handleSaveEdit = useCallback(() => {
    if (editingDocument && editingName.trim()) {
      const updatedDocuments = documents.map(doc =>
        doc.id === editingDocument
          ? { ...doc, name: editingName.trim() }
          : doc
      );
      setDocuments(updatedDocuments);
      saveDocuments(updatedDocuments);
      setEditingDocument(null);
      setEditingName('');
    }
  }, [editingDocument, editingName, documents, saveDocuments]);

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    setEditingDocument(null);
    setEditingName('');
  }, []);

  // 查看文档
  const handleViewDocument = useCallback((document: UserDocument) => {
    const updatedDocuments = documents.map(doc =>
      doc.id === document.id
        ? { ...doc, lastViewed: new Date(), viewCount: doc.viewCount + 1 }
        : doc
    );
    setDocuments(updatedDocuments);
    saveDocuments(updatedDocuments);
    onDocumentSelect(document);
  }, [documents, saveDocuments, onDocumentSelect]);

  // 获取所有分类
  const categories = ['all', ...Array.from(new Set(documents.map(doc => doc.category).filter(Boolean)))];

  // 过滤和排序文档
  useEffect(() => {
    let filtered = documents;

    // 搜索过滤
    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // 分类过滤
    if (filterCategory !== 'all') {
      filtered = filtered.filter(doc => doc.category === filterCategory);
    }

    // 排序
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'uploadTime':
          aValue = a.uploadTime.getTime();
          bValue = b.uploadTime.getTime();
          break;
        case 'lastViewed':
          aValue = a.lastViewed?.getTime() || 0;
          bValue = b.lastViewed?.getTime() || 0;
          break;
        case 'size':
          aValue = a.size;
          bValue = b.size;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredDocuments(filtered);
  }, [documents, searchTerm, sortBy, sortOrder, filterCategory]);

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化日期
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 如果是 compact 模式，显示简化版本
  if (compact) {
    return (
      <div className={`w-full ${className}`}>
        {showTitle && (
          <div className="mb-4">
            <h3 className="text-lg font-medium text-foreground">我的文档</h3>
            <p className="text-sm text-muted-foreground">{documents.length} 个文档</p>
          </div>
        )}
        
        {filteredDocuments.length > 0 ? (
          <div className="space-y-2">
            {(showAllDocuments ? filteredDocuments : filteredDocuments.slice(0, 3)).map((document) => (
              <div
                key={document.id}
                className="p-3 bg-card rounded-lg border border-border hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    {editingDocument === document.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                        />
                        <button
                          onClick={handleSaveEdit}
                          className="px-2 py-1 text-xs text-green-600 hover:text-green-700"
                        >
                          保存
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-2 py-1 text-xs text-red-600 hover:text-red-700"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <h4 
                        className="text-sm font-medium text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                        onClick={() => handleViewDocument(document)}
                      >
                        {document.name}
                      </h4>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(document.size)} • {formatDate(document.uploadTime)}
                    </p>
                  </div>
                  {editingDocument !== document.id && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleStartEdit(document)}
                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                        title="重命名"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(document.id)}
                        className="p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="删除文档"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {filteredDocuments.length > 3 && !showAllDocuments && (
              <div className="text-center pt-2">
                <button
                  onClick={() => setShowAllDocuments(true)}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  查看全部 {filteredDocuments.length} 个文档 →
                </button>
              </div>
            )}
            {showAllDocuments && filteredDocuments.length > 3 && (
              <div className="text-center pt-2">
                <button
                  onClick={() => setShowAllDocuments(false)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  收起文档 ↑
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {documents.length === 0 ? '还没有上传任何文档' : '没有找到匹配的文档'}
            </p>
            {documents.length === 0 && (
              <div className="text-sm text-muted-foreground">
                点击上方的"上传文档"按钮开始使用
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* 标题和统计 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">我的文档</h2>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <HardDrive className="h-4 w-4" />
            <span>{documents.length} 个文档</span>
          </div>
        </div>

        {/* 搜索和过滤 */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索文档名称或标签..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? '所有分类' : category}
                </option>
              ))}
            </select>
            
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
                setSortBy(newSortBy);
                setSortOrder(newSortOrder);
              }}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="uploadTime-desc">上传时间 (新到旧)</option>
              <option value="uploadTime-asc">上传时间 (旧到新)</option>
              <option value="name-asc">名称 (A-Z)</option>
              <option value="name-desc">名称 (Z-A)</option>
              <option value="lastViewed-desc">最近查看</option>
              <option value="size-desc">大小 (大到小)</option>
              <option value="size-asc">大小 (小到大)</option>
            </select>
          </div>
        </div>
      </div>


      {/* 文档列表 */}
      {filteredDocuments.length > 0 ? (
        <div className="grid gap-4">
          {filteredDocuments.map((document) => (
            <div
              key={document.id}
              className="p-4 bg-card rounded-lg border border-border hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <FileText className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    {editingDocument === document.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1 px-2 py-1 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                        />
                        <button
                          onClick={handleSaveEdit}
                          className="px-2 py-1 text-green-600 hover:text-green-700"
                        >
                          保存
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-2 py-1 text-red-600 hover:text-red-700"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <h3 className="text-lg font-medium text-foreground truncate">
                        {document.name}
                      </h3>
                    )}
                    
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                      <span>{formatFileSize(document.size)}</span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(document.uploadTime)}</span>
                      </span>
                      {document.lastViewed && (
                        <span className="flex items-center space-x-1">
                          <Eye className="h-3 w-3" />
                          <span>查看 {document.viewCount} 次</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleViewDocument(document)}
                    className="p-2 text-primary hover:text-primary/80 hover:bg-primary/10 rounded-lg transition-colors"
                    title="查看文档"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleStartEdit(document)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    title="重命名"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteDocument(document.id)}
                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="删除文档"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg text-muted-foreground mb-2">
            {documents.length === 0 ? '还没有上传任何文档' : '没有找到匹配的文档'}
          </p>
          <p className="text-sm text-muted-foreground">
            {documents.length === 0 
              ? '上传你的第一个PDF文档开始使用' 
              : '尝试调整搜索条件或过滤器'
            }
          </p>
        </div>
      )}
    </div>
  );
}
