import { useMemo } from 'react';
import { createPageCalculator } from '@/utils/pageCalculator';
import { PDF_CONFIG } from '@/config/pdf';

export function usePageCalculator(sectionPath: string) {
  return useMemo(() => {
    const section = PDF_CONFIG.sections.find(s => s.filePath === sectionPath);
    if (!section) {
      throw new Error(`Section not found: ${sectionPath}`);
    }
    return createPageCalculator(section);
  }, [sectionPath]);
}
