#!/usr/bin/env python3
"""
创建PDF查看器页面
用于查看Cloudflare Pages上的PDF文件
"""

import os
import json
from pathlib import Path
from datetime import datetime

# 配置
CONFIG = {
    'project_name': 'impa-pdf-storage',
    'pdf_source_dir': './public/pdfs/sections',
    'viewer_output_dir': './public/pdf-viewer',
    'cloudflare_url': 'https://98f17a84.impa-pdf-storage.pages.dev'
}

class Colors:
    RESET = '\033[0m'
    BRIGHT = '\033[1m'
    RED = '\033[31m'
    GREEN = '\033[32m'
    YELLOW = '\033[33m'
    BLUE = '\033[34m'
    MAGENTA = '\033[35m'
    CYAN = '\033[36m'

def log(message, color=Colors.RESET):
    """带颜色的日志输出"""
    print(f"{color}{message}{Colors.RESET}")

def get_pdf_files():
    """获取PDF文件列表"""
    pdf_dir = Path(CONFIG['pdf_source_dir'])
    if not pdf_dir.exists():
        raise FileNotFoundError(f"PDF目录不存在: {pdf_dir}")
    
    pdf_files = []
    for file_path in pdf_dir.glob('*.pdf'):
        size_mb = file_path.stat().st_size / 1024 / 1024
        pdf_files.append({
            'name': file_path.name,
            'size': file_path.stat().st_size,
            'size_mb': round(size_mb, 2),
            'url': f"{CONFIG['cloudflare_url']}/pdfs/{file_path.name}"
        })
    
    # 按文件名排序
    pdf_files.sort(key=lambda x: x['name'])
    
    return pdf_files

def create_pdf_viewer_html(pdf_files):
    """创建PDF查看器HTML页面"""
    html_content = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IMPA PDF 查看器</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }}
        
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            overflow: hidden;
        }}
        
        .header {{
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }}
        
        .header h1 {{
            font-size: 2.5em;
            margin-bottom: 10px;
        }}
        
        .header p {{
            opacity: 0.9;
            font-size: 1.1em;
        }}
        
        .main-content {{
            display: flex;
            min-height: 600px;
        }}
        
        .sidebar {{
            width: 300px;
            background: #f8fafc;
            border-right: 1px solid #e2e8f0;
            overflow-y: auto;
            max-height: 600px;
        }}
        
        .sidebar h3 {{
            padding: 20px;
            background: #e2e8f0;
            color: #374151;
            font-size: 1.1em;
            border-bottom: 1px solid #d1d5db;
        }}
        
        .file-list {{
            list-style: none;
        }}
        
        .file-item {{
            padding: 12px 20px;
            border-bottom: 1px solid #e2e8f0;
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
        }}
        
        .file-item:hover {{
            background: #e0f2fe;
        }}
        
        .file-item.active {{
            background: #2563eb;
            color: white;
        }}
        
        .file-item.active::after {{
            content: '👁️';
            position: absolute;
            right: 15px;
            top: 50%;
            transform: translateY(-50%);
        }}
        
        .file-name {{
            font-weight: 600;
            margin-bottom: 4px;
        }}
        
        .file-size {{
            font-size: 0.85em;
            opacity: 0.7;
        }}
        
        .viewer {{
            flex: 1;
            display: flex;
            flex-direction: column;
        }}
        
        .viewer-header {{
            padding: 20px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        
        .current-file {{
            font-weight: 600;
            color: #374151;
        }}
        
        .viewer-actions {{
            display: flex;
            gap: 10px;
        }}
        
        .btn {{
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9em;
            transition: all 0.2s;
        }}
        
        .btn-primary {{
            background: #2563eb;
            color: white;
        }}
        
        .btn-primary:hover {{
            background: #1d4ed8;
        }}
        
        .btn-secondary {{
            background: #6b7280;
            color: white;
        }}
        
        .btn-secondary:hover {{
            background: #4b5563;
        }}
        
        .pdf-container {{
            flex: 1;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            background: #f8fafc;
        }}
        
        .pdf-iframe {{
            width: 100%;
            height: 100%;
            border: none;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }}
        
        .welcome-message {{
            text-align: center;
            color: #6b7280;
            padding: 40px;
        }}
        
        .welcome-message h3 {{
            margin-bottom: 10px;
            color: #374151;
        }}
        
        .stats {{
            background: #e0f2fe;
            padding: 15px 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #0369a1;
            font-size: 0.9em;
        }}
        
        @media (max-width: 768px) {{
            .main-content {{
                flex-direction: column;
            }}
            
            .sidebar {{
                width: 100%;
                max-height: 200px;
            }}
            
            .pdf-container {{
                min-height: 400px;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📚 IMPA PDF 查看器</h1>
            <p>IMPA Marine Stores Guide - 在线PDF查看工具</p>
        </div>
        
        <div class="main-content">
            <div class="sidebar">
                <h3>📄 文件列表 ({len(pdf_files)} 个文件)</h3>
                <ul class="file-list">
                    {''.join([f'''
                        <li class="file-item" onclick="loadPDF('{file_info['url']}', '{file_info['name']}')">
                            <div class="file-name">{file_info['name']}</div>
                            <div class="file-size">{file_info['size_mb']} MB</div>
                        </li>
                    ''' for file_info in pdf_files])}
                </ul>
            </div>
            
            <div class="viewer">
                <div class="viewer-header">
                    <div class="current-file" id="current-file">请选择一个PDF文件</div>
                    <div class="viewer-actions">
                        <button class="btn btn-primary" onclick="downloadCurrent()" id="download-btn" disabled>下载</button>
                        <button class="btn btn-secondary" onclick="openInNewTab()" id="new-tab-btn" disabled>新窗口打开</button>
                    </div>
                </div>
                
                <div class="pdf-container">
                    <div class="welcome-message" id="welcome-message">
                        <h3>👋 欢迎使用IMPA PDF查看器</h3>
                        <p>从左侧列表中选择一个PDF文件开始查看</p>
                        <p>支持在线预览、下载和新窗口打开</p>
                    </div>
                    <iframe class="pdf-iframe" id="pdf-iframe" style="display: none;"></iframe>
                </div>
            </div>
        </div>
        
        <div class="stats">
            总文件数: {len(pdf_files)} | 总大小: {sum(f['size_mb'] for f in pdf_files):.1f} MB | 更新时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        </div>
    </div>

    <script>
        let currentPDFUrl = '';
        let currentPDFName = '';
        
        function loadPDF(url, name) {{
            currentPDFUrl = url;
            currentPDFName = name;
            
            // 更新当前文件显示
            document.getElementById('current-file').textContent = name;
            
            // 显示PDF iframe
            const iframe = document.getElementById('pdf-iframe');
            const welcome = document.getElementById('welcome-message');
            
            iframe.style.display = 'block';
            welcome.style.display = 'none';
            iframe.src = url;
            
            // 启用按钮
            document.getElementById('download-btn').disabled = false;
            document.getElementById('new-tab-btn').disabled = false;
            
            // 更新文件列表的active状态
            document.querySelectorAll('.file-item').forEach(item => {{
                item.classList.remove('active');
            }});
            event.target.closest('.file-item').classList.add('active');
        }}
        
        function downloadCurrent() {{
            if (currentPDFUrl) {{
                const link = document.createElement('a');
                link.href = currentPDFUrl;
                link.download = currentPDFName;
                link.click();
            }}
        }}
        
        function openInNewTab() {{
            if (currentPDFUrl) {{
                window.open(currentPDFUrl, '_blank');
            }}
        }}
        
        // 键盘快捷键
        document.addEventListener('keydown', function(e) {{
            if (e.key === 'Escape') {{
                // ESC键关闭PDF
                document.getElementById('pdf-iframe').style.display = 'none';
                document.getElementById('welcome-message').style.display = 'block';
                document.getElementById('current-file').textContent = '请选择一个PDF文件';
                document.getElementById('download-btn').disabled = true;
                document.getElementById('new-tab-btn').disabled = true;
                
                // 清除active状态
                document.querySelectorAll('.file-item').forEach(item => {{
                    item.classList.remove('active');
                }});
            }}
        }});
        
        // 页面加载完成后的初始化
        document.addEventListener('DOMContentLoaded', function() {{
            console.log('IMPA PDF查看器已加载');
            console.log('可用快捷键: ESC - 关闭当前PDF');
        }});
    </script>
</body>
</html>"""
    
    return html_content

def create_viewer_directory():
    """创建查看器目录"""
    viewer_dir = Path(CONFIG['viewer_output_dir'])
    viewer_dir.mkdir(parents=True, exist_ok=True)
    log(f"📁 创建查看器目录: {viewer_dir}", Colors.GREEN)
    return viewer_dir

def main():
    """主函数"""
    try:
        log("🚀 创建IMPA PDF查看器", Colors.BRIGHT)
        log("=" * 50, Colors.CYAN)
        
        # 1. 获取PDF文件列表
        pdf_files = get_pdf_files()
        log(f"📁 找到 {len(pdf_files)} 个PDF文件", Colors.CYAN)
        
        # 2. 创建查看器目录
        viewer_dir = create_viewer_directory()
        
        # 3. 生成HTML页面
        html_content = create_pdf_viewer_html(pdf_files)
        
        # 4. 保存HTML文件
        html_path = viewer_dir / 'index.html'
        html_path.write_text(html_content, encoding='utf-8')
        log("📄 创建PDF查看器页面", Colors.GREEN)
        
        # 5. 创建简单的使用说明
        readme_content = f"""# IMPA PDF 查看器

## 📚 功能特性

- ✅ 在线PDF预览
- ✅ 文件列表浏览
- ✅ 一键下载
- ✅ 新窗口打开
- ✅ 响应式设计
- ✅ 键盘快捷键支持

## 🚀 使用方法

1. 打开 `index.html` 文件
2. 从左侧列表选择要查看的PDF文件
3. 使用右侧的按钮进行下载或新窗口打开

## ⌨️ 快捷键

- `ESC`: 关闭当前PDF

## 📁 文件信息

- 总文件数: {len(pdf_files)}
- 总大小: {sum(f['size_mb'] for f in pdf_files):.1f} MB
- 更新时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## 🔗 访问地址

- 本地访问: file://{html_path.absolute()}
- 在线访问: 需要部署到Web服务器
"""
        
        readme_path = viewer_dir / 'README.md'
        readme_path.write_text(readme_content, encoding='utf-8')
        log("📝 创建使用说明", Colors.GREEN)
        
        log("=" * 50, Colors.CYAN)
        log("🎉 PDF查看器创建完成！", Colors.BRIGHT)
        log(f"📱 本地访问: file://{html_path.absolute()}", Colors.GREEN)
        log("💡 提示: 双击 index.html 文件即可在浏览器中打开", Colors.YELLOW)
        
    except Exception as error:
        log(f"❌ 操作失败: {error}", Colors.RED)
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
