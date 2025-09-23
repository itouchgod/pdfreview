#!/usr/bin/env python3
"""
PDF分割工具 - 使用PyPDF2处理IMPA Marine Stores Guide
"""

import os
import sys
import json
from pathlib import Path

try:
    from PyPDF2 import PdfReader, PdfWriter
except ImportError:
    print("需要安装PyPDF2: pip install PyPDF2")
    sys.exit(1)

# PDF分割配置
SPLIT_CONFIG = {
    "sections": [
        {
            "name": "01-目录和前言",
            "start_page": 1,
            "end_page": 50,
            "description": "目录、前言、使用说明"
        },
        {
            "name": "02-船舶设备",
            "start_page": 51,
            "end_page": 200,
            "description": "船舶基本设备和系统"
        },
        {
            "name": "03-机械部件",
            "start_page": 201,
            "end_page": 400,
            "description": "发动机、泵、阀门等机械部件"
        },
        {
            "name": "04-电气设备",
            "start_page": 401,
            "end_page": 600,
            "description": "电气系统、仪表、控制设备"
        },
        {
            "name": "05-安全设备",
            "start_page": 601,
            "end_page": 800,
            "description": "消防、救生、安全设备"
        },
        {
            "name": "06-导航设备",
            "start_page": 801,
            "end_page": 1000,
            "description": "导航、通信、雷达设备"
        },
        {
            "name": "07-甲板设备",
            "start_page": 1001,
            "end_page": 1200,
            "description": "锚、缆绳、甲板机械"
        },
        {
            "name": "08-厨房设备",
            "start_page": 1201,
            "end_page": 1400,
            "description": "厨房、餐厅、生活设备"
        },
        {
            "name": "09-工具和备件",
            "start_page": 1401,
            "end_page": 1600,
            "description": "工具、备件、维护用品"
        },
        {
            "name": "10-附录和索引",
            "start_page": 1601,
            "end_page": -1,  # -1 表示到最后一页
            "description": "附录、索引、参考信息"
        }
    ],
    "output_dir": "./public/pdfs/sections/",
    "max_file_size_mb": 50
}

def get_pdf_info(pdf_path):
    """获取PDF文件信息"""
    try:
        with open(pdf_path, 'rb') as file:
            reader = PdfReader(file)
            page_count = len(reader.pages)
            file_size = os.path.getsize(pdf_path)
            
            return {
                "page_count": page_count,
                "file_size": file_size,
                "is_encrypted": reader.is_encrypted
            }
    except Exception as e:
        print(f"读取PDF文件失败: {e}")
        return None

def split_pdf(pdf_path, output_dir):
    """分割PDF文件"""
    try:
        print("开始分割PDF文件...")
        
        # 创建输出目录
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        
        # 读取PDF文件
        with open(pdf_path, 'rb') as file:
            reader = PdfReader(file)
            total_pages = len(reader.pages)
            
            print(f"PDF总页数: {total_pages}")
            print(f"文件大小: {os.path.getsize(pdf_path) / 1024 / 1024:.1f}MB")
            print(f"是否加密: {'是' if reader.is_encrypted else '否'}")
            
            if reader.is_encrypted:
                print("警告: PDF文件已加密，可能无法正常处理")
            
            # 分割PDF
            for section in SPLIT_CONFIG["sections"]:
                end_page = section["end_page"] if section["end_page"] != -1 else total_pages
                end_page = min(end_page, total_pages)
                
                if section["start_page"] > total_pages:
                    print(f"跳过 {section['name']}: 起始页超出范围")
                    continue
                
                print(f"正在处理: {section['name']} (第{section['start_page']}-{end_page}页)")
                
                # 创建新的PDF写入器
                writer = PdfWriter()
                
                # 复制页面 (PyPDF2使用0基索引)
                for page_num in range(section["start_page"] - 1, end_page):
                    if page_num < total_pages:
                        writer.add_page(reader.pages[page_num])
                
                # 保存分割后的PDF
                output_path = os.path.join(output_dir, f"{section['name']}.pdf")
                with open(output_path, 'wb') as output_file:
                    writer.write(output_file)
                
                file_size = os.path.getsize(output_path) / 1024 / 1024
                print(f"  ✅ 已保存: {output_path} ({file_size:.1f}MB)")
                
                # 检查文件大小
                if file_size > SPLIT_CONFIG["max_file_size_mb"]:
                    print(f"  ⚠️  警告: 文件大小超过{SPLIT_CONFIG['max_file_size_mb']}MB，建议进一步分割")
        
        print("\nPDF分割完成！")
        
        # 生成分割信息文件
        split_info = {
            "original_file": os.path.basename(pdf_path),
            "original_size": os.path.getsize(pdf_path),
            "total_pages": total_pages,
            "sections": [
                {
                    "name": section["name"],
                    "description": section["description"],
                    "start_page": section["start_page"],
                    "end_page": section["end_page"] if section["end_page"] != -1 else total_pages,
                    "file_path": f"sections/{section['name']}.pdf"
                }
                for section in SPLIT_CONFIG["sections"]
            ],
            "split_date": str(Path().cwd())
        }
        
        with open(os.path.join(output_dir, "split-info.json"), 'w', encoding='utf-8') as f:
            json.dump(split_info, f, indent=2, ensure_ascii=False)
        
        print("分割信息已保存到: split-info.json")
        
    except Exception as e:
        print(f"分割PDF失败: {e}")
        import traceback
        traceback.print_exc()

def main():
    pdf_path = "./public/pdfs/impa_8th_2023.pdf"
    
    if not os.path.exists(pdf_path):
        print(f"PDF文件不存在: {pdf_path}")
        return
    
    # 获取PDF信息
    info = get_pdf_info(pdf_path)
    if not info:
        return
    
    print("PDF文件信息:")
    print(f"  页数: {info['page_count']}")
    print(f"  大小: {info['file_size'] / 1024 / 1024:.1f}MB")
    print(f"  加密: {'是' if info['is_encrypted'] else '否'}")
    print()
    
    # 分割PDF
    split_pdf(pdf_path, SPLIT_CONFIG["output_dir"])

if __name__ == "__main__":
    main()
