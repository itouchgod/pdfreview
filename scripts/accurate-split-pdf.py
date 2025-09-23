#!/usr/bin/env python3
"""
精确的PDF分割工具 - 基于IMPA Marine Stores Guide的实际章节结构
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

# 基于用户提供的精确章节信息
ACCURATE_SPLIT_CONFIG = {
    "sections": [
        {
            "name": "15-Cloth_Linen_Products",
            "title": "15, Cloth & Linen Products",
            "start_page": 39,
            "end_page": 48,
            "description": "布料和亚麻制品"
        },
        {
            "name": "17-Tableware_Galley_Utensils",
            "title": "17, Tableware & Galley Utensils",
            "start_page": 49,
            "end_page": 118,
            "description": "餐具和厨房用具"
        },
        {
            "name": "19-Clothing",
            "title": "19, Clothing",
            "start_page": 119,
            "end_page": 131,
            "description": "服装"
        },
        {
            "name": "21-Rope_Hawsers",
            "title": "21, Rope & Hawsers",
            "start_page": 132,
            "end_page": 178,
            "description": "绳索和缆绳"
        },
        {
            "name": "23-Rigging_Equipment_General_Deck_Items",
            "title": "23, Rigging Equipment & General Deck Items",
            "start_page": 179,
            "end_page": 244,
            "description": "索具设备和一般甲板用品"
        },
        {
            "name": "25-Marine_Paint",
            "title": "25, Marine Paint",
            "start_page": 245,
            "end_page": 260,
            "description": "船舶涂料"
        },
        {
            "name": "27-Painting_Equipment",
            "title": "27, Painting Equipment",
            "start_page": 261,
            "end_page": 273,
            "description": "涂装设备"
        },
        {
            "name": "31-Safety_Protective_Gear",
            "title": "31, Safety Protective Gear",
            "start_page": 272,
            "end_page": 298,
            "description": "安全防护装备"
        },
        {
            "name": "33-Safety_Equipment",
            "title": "33, Safety Equipment",
            "start_page": 299,
            "end_page": 415,
            "description": "安全设备"
        },
        {
            "name": "35-Hose_Couplings",
            "title": "35, Hose & Couplings",
            "start_page": 416,
            "end_page": 438,
            "description": "软管和接头"
        },
        {
            "name": "37-Nautical_Equipment",
            "title": "37, Nautical Equipment",
            "start_page": 439,
            "end_page": 485,
            "description": "航海设备"
        },
        {
            "name": "39-Medicine",
            "title": "39, Medicine",
            "start_page": 486,
            "end_page": 526,
            "description": "药品"
        },
        {
            "name": "45-Petroleum_Products",
            "title": "45, Petroleum Products",
            "start_page": 527,
            "end_page": 545,
            "description": "石油产品"
        },
        {
            "name": "47-Stationery",
            "title": "47, Stationery",
            "start_page": 546,
            "end_page": 574,
            "description": "文具用品"
        },
        {
            "name": "49-Hardware",
            "title": "49, Hardware",
            "start_page": 575,
            "end_page": 601,
            "description": "五金件"
        },
        {
            "name": "51-Brushes_Mats",
            "title": "51, Brushes & Mats",
            "start_page": 602,
            "end_page": 615,
            "description": "刷子和垫子"
        },
        {
            "name": "53-Lavatory_Equipment",
            "title": "53, Lavatory Equipment",
            "start_page": 616,
            "end_page": 629,
            "description": "盥洗设备"
        },
        {
            "name": "55-Cleaning_Material_Chemicals",
            "title": "55, Cleaning Material & Chemicals",
            "start_page": 630,
            "end_page": 664,
            "description": "清洁材料和化学品"
        },
        {
            "name": "59-Pneumatic_Electrical_Tools",
            "title": "59, Pneumatic & Electrical Tools",
            "start_page": 665,
            "end_page": 755,
            "description": "气动和电动工具"
        },
        {
            "name": "61-Hand_Tools",
            "title": "61, Hand Tools",
            "start_page": 756,
            "end_page": 861,
            "description": "手工工具"
        },
        {
            "name": "63-Cutting_Tools",
            "title": "63, Cutting Tools",
            "start_page": 862,
            "end_page": 890,
            "description": "切割工具"
        },
        {
            "name": "65-Measuring_Tools",
            "title": "65, Measuring Tools",
            "start_page": 891,
            "end_page": 946,
            "description": "测量工具"
        },
        {
            "name": "67-Metal_Sheets_Bars",
            "title": "67, Metal Sheets, Bars, etc.",
            "start_page": 947,
            "end_page": 967,
            "description": "金属板材、棒材等"
        },
        {
            "name": "69-Screws_Nuts",
            "title": "69, Screws & Nuts",
            "start_page": 968,
            "end_page": 995,
            "description": "螺丝和螺母"
        },
        {
            "name": "71-Pipes_Tubes",
            "title": "71, Pipes & Tubes",
            "start_page": 996,
            "end_page": 1008,
            "description": "管道和管材"
        },
        {
            "name": "73-Pipe_Tube_Fittings",
            "title": "73, Pipe & Tube Fittings",
            "start_page": 1009,
            "end_page": 1045,
            "description": "管道和管材配件"
        },
        {
            "name": "75-Valves_Cocks",
            "title": "75, Valves & Cocks",
            "start_page": 1046,
            "end_page": 1162,
            "description": "阀门和旋塞"
        },
        {
            "name": "77-Bearings",
            "title": "77, Bearings",
            "start_page": 1163,
            "end_page": 1175,
            "description": "轴承"
        },
        {
            "name": "79-Electrical_Equipment",
            "title": "79, Electrical Equipment",
            "start_page": 1176,
            "end_page": 1260,
            "description": "电气设备"
        },
        {
            "name": "81-Packing_Jointing",
            "title": "81, Packing Jointing",
            "start_page": 1261,
            "end_page": 1329,
            "description": "填料和密封"
        },
        {
            "name": "85-Welding_Equipment",
            "title": "85, Welding Equipment",
            "start_page": 1330,
            "end_page": 1355,
            "description": "焊接设备"
        },
        {
            "name": "87-Machinery_Equipment",
            "title": "87, Machinery Equipment",
            "start_page": 1356,
            "end_page": 1367,
            "description": "机械设备"
        },
        {
            "name": "11-Welware_Items",
            "title": "11, Welware Items",
            "start_page": 1368,
            "end_page": 1380,
            "description": "焊接用品"
        },
        {
            "name": "00_10-Provisions_Slop_Chest",
            "title": "00 & 10, Provisions & Slop Chest",
            "start_page": 1381,
            "end_page": 1406,
            "description": "食品和服装柜"
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

def split_pdf_accurate(pdf_path, output_dir):
    """精确的PDF分割"""
    try:
        print("开始精确的PDF分割...")
        
        # 创建输出目录
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        
        # 读取PDF文件
        with open(pdf_path, 'rb') as file:
            reader = PdfReader(file)
            total_pages = len(reader.pages)
            
            print(f"PDF总页数: {total_pages}")
            print(f"文件大小: {os.path.getsize(pdf_path) / 1024 / 1024:.1f}MB")
            print(f"是否加密: {'是' if reader.is_encrypted else '否'}")
            
            # 分割PDF
            for section in ACCURATE_SPLIT_CONFIG["sections"]:
                end_page = min(section["end_page"], total_pages)
                
                if section["start_page"] > total_pages:
                    print(f"跳过 {section['name']}: 起始页超出范围")
                    continue
                
                print(f"正在处理: {section['title']} (第{section['start_page']}-{end_page}页)")
                
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
                if file_size > ACCURATE_SPLIT_CONFIG["max_file_size_mb"]:
                    print(f"  ⚠️  警告: 文件大小超过{ACCURATE_SPLIT_CONFIG['max_file_size_mb']}MB，建议进一步分割")
        
        print("\n精确的PDF分割完成！")
        
        # 生成精确的分割信息文件
        split_info = {
            "original_file": os.path.basename(pdf_path),
            "original_size": os.path.getsize(pdf_path),
            "total_pages": total_pages,
            "split_type": "accurate_by_user_specification",
            "sections": [
                {
                    "name": section["name"],
                    "title": section["title"],
                    "description": section["description"],
                    "start_page": section["start_page"],
                    "end_page": section["end_page"] if section["end_page"] <= total_pages else total_pages,
                    "file_path": f"sections/{section['name']}.pdf"
                }
                for section in ACCURATE_SPLIT_CONFIG["sections"]
            ],
            "split_date": str(Path().cwd())
        }
        
        with open(os.path.join(output_dir, "accurate-split-info.json"), 'w', encoding='utf-8') as f:
            json.dump(split_info, f, indent=2, ensure_ascii=False)
        
        print("精确的分割信息已保存到: accurate-split-info.json")
        
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
    split_pdf_accurate(pdf_path, ACCURATE_SPLIT_CONFIG["output_dir"])

if __name__ == "__main__":
    main()
