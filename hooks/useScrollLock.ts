import { useEffect } from 'react';

export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    const scrollY = window.scrollY;
    const original = document.body.style.cssText;

    document.body.style.cssText = `
      position: fixed;
      top: -${scrollY}px;
      left: 0;
      right: 0;
      overflow-y: scroll;
    `;

    return () => {
      document.body.style.cssText = original;
      window.scrollTo(0, scrollY);
    };
  }, [isLocked]);
}
