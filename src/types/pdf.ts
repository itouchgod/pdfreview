export interface Section {
  filePath: string;
  name: string;
  startPage: number;
  endPage: number;
  title?: string;
}

export interface PageInfo {
  absolutePage: number;
  relativePage: number;
  section: Section;
  isValid: boolean;
}

export type SectionChangeHandler = (sectionPath: string, pageOrReset?: number | boolean) => void;
