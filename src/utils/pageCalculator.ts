// 通用PDF页面计算器 - 简化版本

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
   * 根据文件路径获取章节 - 通用PDF平台简化版本
   */
  static findSection(filePath: string, totalPages?: number): Section | undefined {
    // 通用PDF平台：返回一个默认的章节结构
    if (filePath) {
      return {
        filePath,
        name: filePath.split('/').pop() || 'Document',
        startPage: 1,
        endPage: totalPages || 1 // 使用实际页数，默认为1
      };
    }
    return undefined;
  }

  /**
   * 根据文件路径创建计算器实例
   */
  static fromPath(filePath: string, totalPages?: number): PageCalculator | undefined {
    const section = PageCalculator.findSection(filePath, totalPages);
    return section ? new PageCalculator(section) : undefined;
  }

  /**
   * 根据绝对页码找到对应的章节和相对页码 - 简化版本
   */
  static findPageInfo(absolutePage: number, totalPages: number = 1): PageInfo | undefined {
    // 通用PDF平台：简化处理，假设所有页面都在一个文档中
    const section = {
      filePath: '/default-document.pdf',
      name: 'Document',
      startPage: 1,
      endPage: totalPages
    };
    
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
      // 静默处理无效页码，返回最近的有效页码
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