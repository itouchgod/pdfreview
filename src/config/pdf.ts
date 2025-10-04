// PDF配置文件 - 通用PDF预览平台
export const PDF_CONFIG = {
  // 默认配置
  defaultConfig: {
    name: 'PDF Preview Platform',
    description: '通用PDF预览和搜索平台'
  },
  
  // 搜索配置
  searchConfig: {
    // 搜索结果上下文长度
    contextLength: 50,
    // 最大搜索结果数量
    maxResults: 100,
    // 是否启用高亮显示
    enableHighlight: true
  },
  
  // PDF.js配置
  pdfjsConfig: {
    // 渲染缩放比例
    scale: 1.5,
    // 是否启用文本选择
    enableTextSelection: true,
    // 是否启用打印
    enablePrint: true
  },

  // 文件上传配置
  uploadConfig: {
    // 最大文件大小 (MB) - 设置为 null 表示无限制
    maxFileSize: null,
    // 支持的文件类型
    acceptedTypes: ['.pdf'],
    // 是否允许多文件上传
    allowMultiple: true,
    // 文件大小限制说明
    sizeLimits: {
      // 推荐大小 (MB)
      recommended: 50,
      // 警告大小 (MB) - 超过此大小会显示警告
      warning: 100
    }
  }
};

// 获取PDF文件的完整URL
export const getPDFUrl = (filePath: string): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin + filePath;
  }
  return filePath;
};

// 检查PDF文件是否存在
export const checkPDFExists = async (filePath: string): Promise<boolean> => {
  try {
    const response = await fetch(filePath, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};