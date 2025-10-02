#!/usr/bin/env python3
"""
快速查看PDF文件的命令行工具
"""

import sys
import webbrowser
from pathlib import Path

# 配置
CONFIG = {
    'cloudflare_url': 'https://98f17a84.impa-pdf-storage.pages.dev',
    'pdf_source_dir': './public/pdfs/sections'
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
    
    pdf_files = {}
    for file_path in pdf_dir.glob('*.pdf'):
        pdf_files[file_path.name] = {
            'name': file_path.name,
            'size_mb': round(file_path.stat().st_size / 1024 / 1024, 2),
            'url': f"{CONFIG['cloudflare_url']}/pdfs/{file_path.name}"
        }
    
    return pdf_files

def find_pdf_by_number(pdf_files, number):
    """根据编号查找PDF文件"""
    # 尝试不同的匹配模式
    patterns = [
        f"{number:02d}-",  # 01-, 02-, ...
        f"{number}-",      # 1-, 2-, ...
        f"{number:02d}_",  # 01_, 02_, ...
    ]
    
    for pattern in patterns:
        for name, info in pdf_files.items():
            if name.startswith(pattern):
                return name, info
    
    return None, None

def list_pdf_files(pdf_files):
    """列出所有PDF文件"""
    log("📚 可用的PDF文件:", Colors.CYAN)
    log("=" * 60, Colors.CYAN)
    
    for name, info in sorted(pdf_files.items()):
        # 提取文件编号
        number = name.split('-')[0] if '-' in name else name.split('_')[0]
        log(f"  {number:>2}. {name} ({info['size_mb']} MB)", Colors.MAGENTA)
    
    log("=" * 60, Colors.CYAN)

def open_pdf_in_browser(pdf_url, pdf_name):
    """在浏览器中打开PDF"""
    log(f"🚀 正在打开: {pdf_name}", Colors.BLUE)
    log(f"🔗 URL: {pdf_url}", Colors.CYAN)
    
    try:
        webbrowser.open(pdf_url)
        log("✅ PDF已在浏览器中打开", Colors.GREEN)
    except Exception as error:
        log(f"❌ 打开失败: {error}", Colors.RED)
        log(f"💡 请手动访问: {pdf_url}", Colors.YELLOW)

def show_help():
    """显示帮助信息"""
    log("📚 IMPA PDF 查看工具", Colors.BRIGHT)
    log("=" * 40, Colors.CYAN)
    log("使用方法:", Colors.YELLOW)
    log("  python3 scripts/view_pdf.py [文件编号]", Colors.WHITE)
    log("", Colors.RESET)
    log("示例:", Colors.YELLOW)
    log("  python3 scripts/view_pdf.py 31    # 查看31号文件", Colors.WHITE)
    log("  python3 scripts/view_pdf.py list  # 列出所有文件", Colors.WHITE)
    log("  python3 scripts/view_pdf.py       # 显示帮助", Colors.WHITE)
    log("", Colors.RESET)
    log("快捷键:", Colors.YELLOW)
    log("  - 直接输入数字: 查看对应编号的PDF", Colors.WHITE)
    log("  - 'list': 列出所有可用文件", Colors.WHITE)
    log("  - 'help': 显示此帮助信息", Colors.WHITE)

def main():
    """主函数"""
    try:
        # 获取PDF文件列表
        pdf_files = get_pdf_files()
        
        if len(sys.argv) < 2:
            show_help()
            return 0
        
        command = sys.argv[1].lower()
        
        if command == 'help':
            show_help()
            return 0
        
        if command == 'list':
            list_pdf_files(pdf_files)
            return 0
        
        # 尝试解析为数字
        try:
            number = int(command)
            pdf_name, pdf_info = find_pdf_by_number(pdf_files, number)
            
            if pdf_name and pdf_info:
                open_pdf_in_browser(pdf_info['url'], pdf_name)
            else:
                log(f"❌ 未找到编号为 {number} 的PDF文件", Colors.RED)
                log("💡 使用 'list' 命令查看所有可用文件", Colors.YELLOW)
                return 1
                
        except ValueError:
            log(f"❌ 无效的命令: {command}", Colors.RED)
            show_help()
            return 1
            
    except Exception as error:
        log(f"❌ 操作失败: {error}", Colors.RED)
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
