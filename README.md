# IMPA Marine Stores Guide PDF搜索平台

这是一个基于Next.js构建的PDF搜索平台，专门用于搜索IMPA Marine Stores Guide第8版2023的内容。

## 功能特性

- 🔍 **即时搜索**: 在PDF文档中快速搜索关键词
- 📄 **PDF查看器**: 内置PDF.js查看器，支持页面导航
- 🎯 **精确匹配**: 显示搜索结果所在页面和上下文
- 📱 **响应式设计**: 支持桌面和移动设备
- ⚡ **高性能**: 优化的搜索算法，快速响应

## 技术栈

- **前端框架**: Next.js 14 (App Router)
- **UI组件**: React + TypeScript
- **样式**: Tailwind CSS
- **PDF处理**: PDF.js
- **图标**: Lucide React

## 项目结构

```
pdf-search-app/
├── src/
│   ├── app/
│   │   ├── page.tsx          # 主页面
│   │   ├── layout.tsx        # 布局组件
│   │   └── globals.css       # 全局样式
│   ├── components/
│   │   ├── PDFViewer.tsx     # PDF查看器组件
│   │   └── SearchBox.tsx     # 搜索框组件
│   └── config/
│       └── pdf.ts            # PDF配置文件
├── public/
│   ├── pdfs/                 # PDF文件存储目录
│   └── pdf.worker.min.js     # PDF.js Worker文件
└── README.md
```

## 安装和运行

### 1. 安装依赖

```bash
npm install
```

### 2. 放置PDF文件

将IMPA Marine Stores Guide PDF文件放置在以下位置：
```
public/pdfs/impa_8th_2023.pdf
```

**重要提示**: 
- PDF文件大小约494.1MB
- 确保文件名与配置中的路径一致（impa_8th_2023.pdf）

### 3. PDF文件分割（推荐）

为了提高加载性能，建议将大PDF文件分割为多个章节：

```bash
# 使用Python脚本分割PDF
python3 scripts/split-pdf.py
```

**分割结果**：
- 原始文件：471MB → 9个章节文件（19-64MB）
- 分割后的文件将保存在 `public/pdfs/sections/` 目录
- 每个章节按功能分类，便于快速定位和搜索

**精确的章节分类**（基于实际IMPA章节结构）：

**生活用品**
- 15, Cloth & Linen Products (3.1MB) - 第39-48页
- 19, Clothing (3.6MB) - 第119-131页
- 00 & 10, Provisions & Slop Chest (9.5MB) - 第1381-1406页

**厨房用品**
- 17, Tableware & Galley Utensils (21.5MB) - 第49-118页

**甲板设备**
- 21, Rope & Hawsers (15.7MB) - 第132-178页
- 23, Rigging Equipment & General Deck Items (20.8MB) - 第179-244页

**涂装材料**
- 25, Marine Paint (4.7MB) - 第245-260页
- 27, Painting Equipment (3.8MB) - 第261-273页

**安全设备**
- 31, Safety Protective Gear (8.7MB) - 第272-298页
- 33, Safety Equipment (35.0MB) - 第299-415页

**管道系统**
- 35, Hose & Couplings (6.7MB) - 第416-438页
- 71, Pipes & Tubes (3.5MB) - 第996-1008页
- 73, Pipe & Tube Fittings (11.0MB) - 第1009-1045页
- 75, Valves & Cocks (37.9MB) - 第1046-1162页

**导航设备**
- 37, Nautical Equipment (15.3MB) - 第439-485页

**医疗用品**
- 39, Medicine (12.3MB) - 第486-526页

**化工产品**
- 45, Petroleum Products (6.2MB) - 第527-545页

**办公用品**
- 47, Stationery (8.4MB) - 第546-574页

**五金配件**
- 49, Hardware (6.9MB) - 第575-601页
- 69, Screws & Nuts (8.0MB) - 第968-995页

**清洁用品**
- 51, Brushes & Mats (3.9MB) - 第602-615页
- 55, Cleaning Material & Chemicals (10.3MB) - 第630-664页

**生活设施**
- 53, Lavatory Equipment (3.5MB) - 第616-629页

**工具设备**
- 59, Pneumatic & Electrical Tools (28.3MB) - 第665-755页
- 61, Hand Tools (30.3MB) - 第756-861页
- 63, Cutting Tools (7.7MB) - 第862-890页
- 65, Measuring Tools (18.3MB) - 第891-946页

**金属材料**
- 67, Metal Sheets, Bars, etc. (6.3MB) - 第947-967页

**机械配件**
- 77, Bearings (4.3MB) - 第1163-1175页

**电气系统**
- 79, Electrical Equipment (25.9MB) - 第1176-1260页

**密封材料**
- 81, Packing Jointing (22.5MB) - 第1261-1329页

**焊接设备**
- 85, Welding Equipment (8.3MB) - 第1330-1355页
- 11, Welware Items (3.8MB) - 第1368-1380页

**机械设备**
- 87, Machinery Equipment (3.8MB) - 第1356-1367页

### 4. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 使用说明

### 搜索功能

1. **基本搜索**: 在搜索框中输入关键词，点击"搜索"按钮
2. **快速搜索**: 使用 `Ctrl+Enter` 快捷键进行快速搜索
3. **结果导航**: 点击搜索结果可跳转到对应页面
4. **上下文显示**: 搜索结果会显示匹配文本的上下文
5. **智能建议**: 输入关键词时自动显示相关章节建议
6. **跨章节搜索**: 通过搜索建议快速切换到相关章节
7. **精确分类**: 基于IMPA实际章节结构的智能搜索

### PDF查看器

1. **页面导航**: 使用"上一页"/"下一页"按钮或直接输入页码
2. **缩放控制**: 支持鼠标滚轮缩放
3. **文本选择**: 可以直接选择和复制PDF中的文本

## 性能优化建议

### 对于大型PDF文件（494.1MB）

由于PDF文件较大，建议采用以下优化策略：

1. **服务器端处理**:
   - 将PDF文本提取移至后端
   - 使用Elasticsearch或向量数据库进行搜索
   - 实现分页加载和缓存机制

2. **文件优化**:
   - 压缩PDF文件
   - 分割为多个小文件
   - 生成文本索引文件

3. **前端优化**:
   - 实现懒加载
   - 使用Web Workers处理搜索
   - 添加加载状态和进度条

## 部署

### Vercel部署

```bash
npm run build
vercel --prod
```

### Docker部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 配置说明

在 `src/config/pdf.ts` 中可以配置：

- PDF文件路径
- 搜索参数
- PDF.js渲染选项
- 文件信息

## 故障排除

### 常见问题

1. **PDF文件无法加载**
   - 检查文件路径是否正确
   - 确认文件存在于 `public/pdfs/` 目录
   - 检查文件权限

2. **搜索功能不工作**
   - 确认PDF.js worker文件已正确加载
   - 检查浏览器控制台是否有错误
   - 验证PDF文本提取是否成功

3. **性能问题**
   - 考虑使用更小的PDF文件
   - 实现服务器端搜索
   - 添加缓存机制

## 开发计划

- [ ] 实现服务器端搜索API
- [ ] 添加搜索历史功能
- [ ] 支持多PDF文件搜索
- [ ] 添加书签和注释功能
- [ ] 实现全文索引和高级搜索

## 许可证

MIT License

## 项目状态

✅ **已完成功能**：
- Next.js项目基础架构
- PDF.js集成和动态加载
- PDF查看器组件
- 搜索功能组件
- 响应式用户界面
- 配置文件管理
- 测试页面
- **PDF文件分割和章节选择**
- **多PDF文件支持**

✅ **技术特点**：
- 支持494.1MB大型PDF文件
- **智能PDF分割：将大文件分割为9个功能章节**
- 客户端动态加载PDF.js避免SSR问题
- 实时文本提取和搜索
- 页面导航和跳转功能
- 现代化的UI设计
- **章节选择器：用户可选择特定章节进行查看和搜索**

✅ **性能优化**：
- **PDF分割优化：原始471MB文件分割为9个章节（19-64MB）**
- **快速加载：每个章节文件大小控制在50MB以内**
- **按需加载：用户只需加载需要的章节**
- 建议在生产环境中实现服务器端搜索

