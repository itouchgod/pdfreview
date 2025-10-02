#!/usr/bin/env python3
"""
上传PDF文件到Cloudflare Pages
清空现有文件并上传新的PDF文件
"""

import os
import sys
import shutil
import subprocess
import json
from pathlib import Path
from datetime import datetime

# 配置
CONFIG = {
    'project_name': 'impa-pdf-storage',
    'pdf_source_dir': './public/pdfs/sections',
    'temp_dir': './temp-cloudflare-upload',
    'account_id': '3bdbf85a2f2a120ab9724fdc625749f2'
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

def exec_command(command, description):
    """执行命令并处理错误"""
    try:
        log(f"🔄 {description}...", Colors.BLUE)
        result = subprocess.run(command, shell=True, capture_output=True, text=True, check=True)
        log(f"✅ {description} 完成", Colors.GREEN)
        return result.stdout
    except subprocess.CalledProcessError as error:
        log(f"❌ {description} 失败: {error.stderr}", Colors.RED)
        raise

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
            'path': str(file_path),
            'size': file_path.stat().st_size,
            'size_mb': round(size_mb, 2)
        })
    
    log(f"📁 找到 {len(pdf_files)} 个PDF文件", Colors.CYAN)
    for file_info in pdf_files:
        log(f"   - {file_info['name']} ({file_info['size_mb']} MB)", Colors.MAGENTA)
    
    return pdf_files

def create_temp_directory():
    """创建临时目录"""
    temp_dir = Path(CONFIG['temp_dir'])
    
    # 清理临时目录
    if temp_dir.exists():
        log("🧹 清理临时目录...", Colors.YELLOW)
        shutil.rmtree(temp_dir)
    
    # 创建临时目录
    temp_dir.mkdir(parents=True, exist_ok=True)
    log(f"📁 创建临时目录: {temp_dir}", Colors.GREEN)
    
    return temp_dir

def copy_pdfs_to_temp(temp_dir, pdf_files):
    """复制PDF文件到临时目录"""
    pdfs_dir = temp_dir / 'pdfs'
    pdfs_dir.mkdir(exist_ok=True)
    
    log("📋 复制PDF文件到临时目录...", Colors.BLUE)
    for file_info in pdf_files:
        dest_path = pdfs_dir / file_info['name']
        shutil.copy2(file_info['path'], dest_path)
        log(f"   ✅ 复制: {file_info['name']}", Colors.GREEN)
    
    # 复制JSON配置文件
    json_source = Path(CONFIG['pdf_source_dir']) / 'accurate-split-info.json'
    if json_source.exists():
        json_dest = pdfs_dir / 'accurate-split-info.json'
        shutil.copy2(json_source, json_dest)
        log("   ✅ 复制: accurate-split-info.json", Colors.GREEN)

def create_index_html(temp_dir, pdf_files):
    """创建索引HTML页面"""
    index_content = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IMPA PDF Storage</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }}
        .container {{
            background: white;
            padding: 40px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }}
        h1 {{
            color: #2563eb;
            text-align: center;
            margin-bottom: 30px;
            font-size: 2.5em;
        }}
        .stats {{
            background: linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            text-align: center;
            border: 2px solid #81d4fa;
        }}
        .file-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }}
        .file-item {{
            padding: 15px;
            background: #f8fafc;
            border-radius: 8px;
            border-left: 4px solid #2563eb;
            transition: transform 0.2s, box-shadow 0.2s;
        }}
        .file-item:hover {{
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }}
        .file-name {{
            font-weight: 600;
            color: #1e40af;
            margin-bottom: 5px;
        }}
        .file-size {{
            color: #64748b;
            font-size: 0.9em;
        }}
        .footer {{
            text-align: center;
            color: #64748b;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>📚 IMPA Marine Stores Guide</h1>
        <div class="stats">
            <strong>总文件数:</strong> {len(pdf_files)} 个PDF文件<br>
            <strong>更新时间:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}<br>
            <strong>总大小:</strong> {sum(f['size_mb'] for f in pdf_files):.1f} MB
        </div>
        <h2>📄 可用文件列表</h2>
        <div class="file-grid">
            {''.join([f'''
                <div class="file-item">
                    <div class="file-name">{file_info['name']}</div>
                    <div class="file-size">{file_info['size_mb']} MB</div>
                </div>
            ''' for file_info in pdf_files])}
        </div>
        <div class="footer">
            <p>🚀 由 Cloudflare Pages 托管</p>
            <p>🔗 <a href="https://ceb894f3.impa-pdf-storage.pages.dev" target="_blank">访问地址</a></p>
        </div>
    </div>
</body>
</html>"""
    
    index_path = temp_dir / 'index.html'
    index_path.write_text(index_content, encoding='utf-8')
    log("📄 创建 index.html", Colors.GREEN)

def deploy_to_cloudflare(temp_dir):
    """部署到Cloudflare Pages"""
    log("🚀 开始部署到 Cloudflare Pages...", Colors.BLUE)
    
    try:
        # 使用 wrangler pages deploy 命令
        deploy_command = f'wrangler pages deploy "{temp_dir}" --project-name="{CONFIG["project_name"]}"'
        
        log(f"执行命令: {deploy_command}", Colors.CYAN)
        result = subprocess.run(deploy_command, shell=True, check=True, capture_output=True, text=True)
        
        log("🎉 部署成功！", Colors.GREEN)
        return result.stdout
    except subprocess.CalledProcessError as error:
        log(f"❌ 部署失败: {error.stderr}", Colors.RED)
        raise

def cleanup(temp_dir):
    """清理临时文件"""
    if temp_dir.exists():
        log("🧹 清理临时文件...", Colors.YELLOW)
        shutil.rmtree(temp_dir)
        log("✅ 清理完成", Colors.GREEN)

def main():
    """主函数"""
    try:
        log("🚀 开始上传PDF文件到Cloudflare Pages", Colors.BRIGHT)
        log("=" * 50, Colors.CYAN)
        
        # 1. 获取PDF文件列表
        pdf_files = get_pdf_files()
        if not pdf_files:
            raise ValueError("没有找到PDF文件")
        
        # 2. 创建临时目录
        temp_dir = create_temp_directory()
        
        # 3. 复制PDF文件
        copy_pdfs_to_temp(temp_dir, pdf_files)
        
        # 4. 创建索引页面
        create_index_html(temp_dir, pdf_files)
        
        # 5. 部署到Cloudflare
        deploy_to_cloudflare(temp_dir)
        
        # 6. 清理临时文件
        cleanup(temp_dir)
        
        log("=" * 50, Colors.CYAN)
        log("🎉 所有操作完成！", Colors.BRIGHT)
        log(f"📱 访问地址: https://{CONFIG['project_name']}.pages.dev", Colors.GREEN)
        log("🔗 自定义域名: https://ceb894f3.impa-pdf-storage.pages.dev", Colors.GREEN)
        
    except Exception as error:
        log(f"❌ 操作失败: {error}", Colors.RED)
        sys.exit(1)

if __name__ == "__main__":
    main()
