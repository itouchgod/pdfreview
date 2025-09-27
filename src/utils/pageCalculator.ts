import { PDF_CONFIG } from '@/config/pdf';

interface Section {
  filePath: string;
  name: string;
  startPage: number;
  endPage: number;
}

interface PageInfo {
  absolutePage: number;
  relativePage: number;
  section: Section;
  isValid: boolean;
}

export class PageCalculator {
  private section: Section;

  constructor(section: Section) {
    this.section = section;
  }

  /**
   * 根据文件路径获取章节
   */
  static findSection(filePath: string): Section | undefined {
    return PDF_CONFIG.sections.find(s => s.filePath === filePath);
  }

  /**
   * 根据文件路径创建计算器实例
   */
  static fromPath(filePath: string): PageCalculator | undefined {
    const section = PageCalculator.findSection(filePath);
    return section ? new PageCalculator(section) : undefined;
  }

  /**
   * 根据绝对页码找到对应的章节和相对页码
   */
  static findPageInfo(absolutePage: number): PageInfo | undefined {
    for (const section of PDF_CONFIG.sections) {
      if (absolutePage >= section.startPage && absolutePage <= section.endPage) {
        const calculator = new PageCalculator(section);
        const relativePage = calculator.toRelativePage(absolutePage);
        return {
          absolutePage,
          relativePage,
          section,
          isValid: true
        };
      }
    }
    return undefined;
  }

  /**
   * 获取章节信息
   */
  getSection(): Section {
    return this.section;
  }

  /**
   * 获取章节的总页数
   */
  getTotalPages(): number {
    return this.section.endPage - this.section.startPage + 1;
  }

  /**
   * 将绝对页码转换为相对页码
   * @param absolutePage 绝对页码
   */
  toRelativePage(absolutePage: number): number {
    // 先验证绝对页码是否有效
    if (!this.isValidAbsolutePage(absolutePage)) {
      console.error('Invalid absolute page:', {
        absolutePage,
        startPage: this.section.startPage,
        endPage: this.section.endPage,
        section: this.section.name
      });
      // 返回最近的有效页码
      return this.getValidRelativePage(1);
    }

    const relativePage = absolutePage - this.section.startPage + 1;
    if (process.env.NODE_ENV === 'development') {
      console.debug('Page conversion:', {
        type: 'absolute_to_relative',
        absolutePage,
        relativePage,
        section: this.section.name
      });
    }
    return relativePage;
  }

  /**
   * 将相对页码转换为绝对页码
   * @param relativePage 相对页码
   */
  toAbsolutePage(relativePage: number): number {
    const absolutePage = relativePage + this.section.startPage - 1;
    if (process.env.NODE_ENV === 'development') {
      console.debug('Page conversion:', {
        type: 'relative_to_absolute',
        relativePage,
        absolutePage,
        section: this.section.name
      });
    }
    return absolutePage;
  }

  /**
   * 验证相对页码是否有效
   * @param relativePage 相对页码
   */
  isValidRelativePage(relativePage: number): boolean {
    return relativePage >= 1 && relativePage <= this.getTotalPages();
  }

  /**
   * 验证绝对页码是否有效
   * @param absolutePage 绝对页码
   */
  isValidAbsolutePage(absolutePage: number): boolean {
    return absolutePage >= this.section.startPage && absolutePage <= this.section.endPage;
  }

  /**
   * 获取有效的相对页码（如果超出范围则返回最近的有效值）
   * @param relativePage 相对页码
   */
  getValidRelativePage(relativePage: number): number {
    return Math.min(Math.max(1, relativePage), this.getTotalPages());
  }

  /**
   * 获取有效的绝对页码（如果超出范围则返回最近的有效值）
   * @param absolutePage 绝对页码
   */
  getValidAbsolutePage(absolutePage: number): number {
    return Math.min(Math.max(this.section.startPage, absolutePage), this.section.endPage);
  }

  /**
   * 从搜索结果中获取相对页码
   * @param result 搜索结果对象
   */
  getRelativePageFromResult(result: { page: number; relativePage?: number }): number {
    if (result.relativePage !== undefined) {
      return this.getValidRelativePage(result.relativePage);
    }
    return this.toRelativePage(result.page);
  }
}

// 已废弃，请使用 PageCalculator.fromPath 代替
export function createPageCalculator(section: Section): PageCalculator {
  console.warn('createPageCalculator is deprecated, please use PageCalculator.fromPath instead');
  return new PageCalculator(section);
}
