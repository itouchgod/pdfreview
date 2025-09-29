'use client';

import { useEffect } from 'react';
import { initDevTools } from '@/lib/devTools';

export default function DevToolsInit() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      initDevTools();
    }
  }, []);

  return null; // 这个组件不渲染任何内容
}
