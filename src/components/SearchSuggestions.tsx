'use client';

import { useState, useEffect } from 'react';
import { Search, ArrowRight, FileText } from 'lucide-react';
import { PDF_CONFIG } from '@/config/pdf';

interface SearchSuggestionsProps {
  searchTerm: string;
  onSelectSection: (sectionName: string, sectionPath: string) => void;
  currentSection?: string;
}

export default function SearchSuggestions({ searchTerm, onSelectSection, currentSection }: SearchSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Array<{
    section: typeof PDF_CONFIG.sections[0];
    relevance: number;
    keywords: string[];
  }>>([]);

  // 搜索建议的关键词映射
  const keywordMappings = {
    // 工具相关
    'tool': ['59', '61', '63', '65'],
    'tools': ['59', '61', '63', '65'],
    'hand tool': ['61'],
    'hand tools': ['61'],
    'cutting': ['63'],
    'measuring': ['65'],
    'pneumatic': ['59'],
    'electrical tool': ['59'],
    
    // 安全设备
    'safety': ['31', '33'],
    'protective': ['31'],
    'gear': ['31'],
    'equipment': ['33'],
    
    // 管道系统
    'valve': ['75'],
    'valves': ['75'],
    'pipe': ['71', '73'],
    'pipes': ['71', '73'],
    'tube': ['71', '73'],
    'hose': ['35'],
    'coupling': ['35'],
    'couplings': ['35'],
    
    // 电气设备
    'electrical': ['79'],
    'electric': ['79'],
    'electrical equipment': ['79'],
    
    // 清洁用品
    'cleaning': ['51', '55'],
    'brush': ['51'],
    'brushes': ['51'],
    'chemical': ['55'],
    'chemicals': ['55'],
    
    // 生活用品
    'cloth': ['15'],
    'linen': ['15'],
    'clothing': ['19'],
    'clothes': ['19'],
    'tableware': ['17'],
    'galley': ['17'],
    'kitchen': ['17'],
    
    // 甲板设备
    'rope': ['21'],
    'ropes': ['21'],
    'hawser': ['21'],
    'rigging': ['23'],
    'deck': ['23'],
    
    // 涂装材料
    'paint': ['25', '27'],
    'painting': ['25', '27'],
    'marine paint': ['25'],
    
    // 医疗用品
    'medicine': ['39'],
    'medical': ['39'],
    'drug': ['39'],
    'pharmaceutical': ['39'],
    
    // 五金配件
    'hardware': ['49'],
    'screw': ['69'],
    'screws': ['69'],
    'nut': ['69'],
    'nuts': ['69'],
    'bearing': ['77'],
    'bearings': ['77'],
    
    // 金属材料
    'metal': ['67'],
    'sheet': ['67'],
    'bar': ['67'],
    'steel': ['67'],
    
    // 焊接设备
    'welding': ['85', '11'],
    'weld': ['85', '11'],
    'welder': ['85'],
    
    // 机械设备
    'machinery': ['87'],
    'machine': ['87'],
    'mechanical': ['87'],
    
    // 密封材料
    'packing': ['81'],
    'jointing': ['81'],
    'seal': ['81'],
    'gasket': ['81'],
    
    // 导航设备
    'nautical': ['37'],
    'navigation': ['37'],
    'compass': ['37'],
    
    // 化工产品
    'petroleum': ['45'],
    'oil': ['45'],
    'fuel': ['45'],
    
    // 办公用品
    'stationery': ['47'],
    'office': ['47'],
    'paper': ['47'],
    
    // 生活设施
    'lavatory': ['53'],
    'bathroom': ['53'],
    'toilet': ['53'],
    
    // 食品
    'provision': ['00_10'],
    'food': ['00_10'],
    'slop': ['00_10']
  };

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSuggestions([]);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const newSuggestions: Array<{
      section: typeof PDF_CONFIG.sections[0];
      relevance: number;
      keywords: string[];
    }> = [];

    // 查找匹配的章节
    Object.entries(keywordMappings).forEach(([keyword, sectionNumbers]) => {
      if (searchLower.includes(keyword)) {
        sectionNumbers.forEach(sectionNum => {
          const section = PDF_CONFIG.sections.find(s => s.name.startsWith(sectionNum));
          if (section && !newSuggestions.find(s => s.section.name === section.name)) {
            newSuggestions.push({
              section,
              relevance: keyword.length,
              keywords: [keyword]
            });
          }
        });
      }
    });

    // 按相关性排序
    newSuggestions.sort((a, b) => b.relevance - a.relevance);
    setSuggestions(newSuggestions.slice(0, 5)); // 最多显示5个建议

  }, [searchTerm]);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 bg-blue-50 rounded-lg p-4">
      <div className="flex items-center mb-3">
        <Search className="h-4 w-4 text-blue-600 mr-2" />
        <h4 className="text-sm font-medium text-blue-900">搜索建议</h4>
      </div>
      
      <div className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-2 bg-white rounded border border-blue-200 hover:bg-blue-50 cursor-pointer transition-colors"
            onClick={() => onSelectSection(suggestion.section.title, suggestion.section.filePath)}
          >
            <div className="flex items-center space-x-3">
              <FileText className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-sm font-medium text-gray-800">
                  {suggestion.section.title}
                </div>
                <div className="text-xs text-gray-600">
                  {suggestion.section.description}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">
                第{suggestion.section.startPage}-{suggestion.section.endPage}页
              </span>
              <ArrowRight className="h-3 w-3 text-blue-600" />
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-3 text-xs text-blue-700">
        💡 点击建议可快速跳转到相关章节进行搜索
      </div>
    </div>
  );
}
