# PDF预览平台

这是一个基于Next.js构建的通用PDF预览和搜索平台。平台采用现代化的设计和技术，提供流畅的用户体验和高效的搜索功能。

## 🌟 核心功能

- 🔍 **智能搜索**
  - 即时搜索和结果预览
  - 全文搜索
  - 搜索结果高亮显示
  - 智能上下文展示
  - 搜索结果动态高度调整

- 📄 **高级PDF查看**
  - 内置PDF.js查看器
  - 精确页面导航
  - 智能缩放控制
  - 文本选择和复制
  - 页面宽高比自动适配

- 📱 **移动端优化**
  - PWA支持，可安装到主屏幕
  - 触摸友好的操作界面
  - 底部导航栏设计
  - 智能布局适配
  - 手势操作支持

- ⚡ **性能优化**
  - 按需加载机制
  - 本地缓存系统
  - 资源预加载
  - 响应式图片加载

## 💫 界面特性

### 桌面端体验
- 现代化的Material Design风格
- 可拖动的悬浮按钮设计
- 流畅的动画过渡效果
- 键盘快捷键支持
- 智能布局比例（3:1或4:1）
- 悬浮按钮位置记忆功能

### 移动端体验
- 专用底部导航栏
- 大按钮易触设计
- 动态搜索结果面板
- 智能文本截断
- 沉浸式阅读体验

### 平板端优化
- 结合桌面端和移动端的优点
- 适中尺寸的控制按钮
- 灵活的布局切换
- 触摸和鼠标双重支持

## 🛠 技术栈

- **框架**: Next.js 14 (App Router)
- **UI**: React + TypeScript
- **样式**: Tailwind CSS
- **PDF处理**: PDF.js
- **图标**: Lucide React
- **缓存**: LocalStorage + 自定义缓存系统

## 📦 智能缓存系统

- **PDF文件缓存**: 1年有效期，PDF文件不会变化，最大化缓存效果
- **搜索结果缓存**: 7天有效期，平衡性能与新鲜度
- **静态资源缓存**: 1年有效期，减少服务器压力
- **版本控制机制**: 确保数据一致性和兼容性
- **用户可手动管理缓存**: 支持清理和重置

## 🚀 快速开始

### 环境要求
- Node.js 18.0 或更高版本
- npm 或 yarn 包管理器

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd pdfreview
```

2. **安装依赖**
```bash
npm install
# 或
yarn install
```

3. **启动开发服务器**
```bash
npm run dev
# 或
yarn dev
```

4. **访问应用**
打开浏览器访问 [http://localhost:3000](http://localhost:3000)

### 构建生产版本
```bash
npm run build
npm start
```

## 📁 项目结构

```
pdfreview/
├── src/
│   ├── app/                    # Next.js App Router页面
│   │   ├── page.tsx           # 首页（包含文档管理功能）
│   │   └── search/            # 搜索页面
│   ├── components/            # React组件
│   │   ├── PDFViewer.tsx     # PDF查看器
│   │   ├── UserDocumentManager.tsx # 用户文档管理组件
│   │   ├── SmartSearchBox.tsx # 智能搜索框
│   │   └── ...
│   ├── contexts/              # React Context
│   │   ├── PDFTextContext.tsx # PDF文本数据管理
│   │   └── ThemeContext.tsx   # 主题管理
│   ├── lib/                   # 工具库
│   │   ├── cache.ts          # 缓存系统
│   │   ├── performance.ts    # 性能监控
│   │   └── ...
│   ├── types/                 # TypeScript类型定义
│   └── utils/                 # 工具函数
├── public/                    # 静态资源
│   ├── pdfs/                 # PDF文件目录
│   └── ...
├── scripts/                   # 构建脚本
└── ...
```

## 🎯 功能使用指南

### 首页功能
- **极简设计**: 清晰的界面，专注于核心功能
- **快速上传**: 点击"上传文档"按钮直接上传PDF文档
- **快速搜索**: 点击"搜索文档"按钮进入搜索页面
- **最近文档**: 首页显示最近上传的文档，支持快速查看
- **文档管理**: 直接在首页管理文档，支持重命名、删除等操作
- **主题切换**: 右上角主题切换按钮（浅色/深色/跟随系统）

### PDF文件查看
#### 用户文档管理
- 在首页直接上传和管理PDF文档
- 支持拖拽上传、文件验证、进度显示
- 管理文档：重命名、删除、分类
- 搜索文档内容，支持高级过滤
- 查看文档统计信息（查看次数、上传时间等）

#### PDF功能访问
- **首页**: `/` - 极简导航、文档管理和快速访问
- **搜索页面**: `/search` - 高级搜索功能

### 开发者工具（开发环境）
在浏览器控制台中输入以下命令：

```javascript
// 性能监控
devTools.performance.enableVerbose()  // 启用详细性能日志
devTools.performance.disableVerbose() // 禁用详细性能日志
devTools.performance.getMetrics()     // 查看所有性能指标
devTools.performance.getAverages()    // 查看平均性能

// 工具
devTools.clearConsole()               // 清空控制台
devTools.help()                       // 显示帮助信息
```

## 🚀 最新改进 (2024-12-19)

### 📱 移动端文件选择器优化
- **直接文件管理器访问**: 在安卓系统中，点击上传按钮现在直接打开文件管理器界面，而不是选择操作界面
- **智能文件类型过滤**: 自动过滤显示PDF文件，提升用户体验
- **移动端专用提示**: 为移动端用户提供更清晰的操作指引
- **跨平台兼容**: 保持桌面端和移动端的最佳体验

### 🎨 极简首页设计
- **简洁界面**: 移除复杂的搜索区域和功能按钮，专注于核心功能
- **清晰导航**: 大按钮设计，明确的功能入口
- **快速访问**: 首页直接显示最近文档，支持快速查看
- **响应式布局**: 适配桌面端和移动端的极简设计

### ✨ 用户自定义PDF上传功能
- **PDF上传组件**: 支持拖拽上传、文件验证、进度显示
- **文档管理**: 用户文档列表、重命名、删除、分类管理
- **本地存储**: 文档信息持久化保存，支持离线访问
- **文件验证**: 支持PDF格式验证、文件大小限制

### 🔍 增强搜索功能
- **高级搜索**: 支持文档类型过滤、文件大小过滤、日期范围过滤
- **搜索历史**: 自动保存搜索历史，支持快速重复搜索
- **搜索建议**: 基于历史记录的智能搜索建议
- **跨文档搜索**: 支持在多个用户文档中搜索

### ⚡ 性能优化
- **智能缓存系统**: 多级缓存策略，支持LRU淘汰和优先级管理
- **内存管理**: 自动清理过期缓存，防止内存泄漏
- **加载优化**: 智能预加载和懒加载机制
- **响应式优化**: 针对不同设备的性能调优

## 🔧 配置说明

### 环境变量
创建 `.env.local` 文件并配置以下变量：

```env
# 应用配置
NEXT_PUBLIC_APP_NAME="PDF预览平台"
NEXT_PUBLIC_APP_VERSION="1.0.0"

# 缓存配置
NEXT_PUBLIC_CACHE_VERSION="1.0.0"
NEXT_PUBLIC_CACHE_MAX_SIZE="100MB"

# 性能配置
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING="true"
NEXT_PUBLIC_ENABLE_VERBOSE_LOGGING="false"
```

### 自定义配置
在 `src/config/` 目录下可以自定义各种配置：

- `pdf.ts` - PDF相关配置
- 其他配置文件...

## 📊 性能指标

### 加载性能
- 首屏加载时间: < 2秒
- 交互就绪时间: < 3秒
- PDF渲染时间: < 1秒

### 缓存效率
- 缓存命中率: > 90%
- 内存使用优化: < 100MB
- 存储空间管理: 自动清理

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React框架
- [PDF.js](https://mozilla.github.io/pdf.js/) - PDF渲染引擎
- [Tailwind CSS](https://tailwindcss.com/) - CSS框架
- [Lucide React](https://lucide.dev/) - 图标库

## 📞 支持

如果你遇到任何问题或有建议，请：

1. 查看 [Issues](https://github.com/your-repo/issues) 页面
2. 创建新的 Issue
3. 联系维护者

---

**注意**: 这是一个通用PDF预览平台，支持用户上传和管理自己的PDF文档。