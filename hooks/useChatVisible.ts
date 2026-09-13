"use client";
import { useEffect, useState } from 'react';
export function useChatVisible(mobileView: string) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 640px)');
    const update = () => setVisible(document.visibilityState === 'visible' && (media.matches || mobileView === 'chat'));
    update(); media.addEventListener('change', update); document.addEventListener('visibilitychange', update);
    return () => { media.removeEventListener('change', update); document.removeEventListener('visibilitychange', update); };
  }, [mobileView]);
  return visible;
}
