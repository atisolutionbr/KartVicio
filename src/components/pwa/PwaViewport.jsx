import { useLayoutEffect } from 'react';

export default function PwaViewport() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const standalone = window.matchMedia('(display-mode: standalone)');
    const syncViewport = () => {
      const installed = standalone.matches || window.navigator.standalone === true;
      root.classList.toggle('pwa-installed', installed);
      root.style.setProperty('--app-scale', installed ? '0.7' : '1');
      root.style.setProperty('--app-viewport-width', `${root.clientWidth || window.innerWidth}px`);
      root.style.setProperty('--app-viewport-height', `${window.innerHeight}px`);
    };
    syncViewport();
    const observer = new ResizeObserver(syncViewport);
    observer.observe(root);
    standalone.addEventListener('change', syncViewport);
    window.addEventListener('resize', syncViewport);
    window.addEventListener('orientationchange', syncViewport);
    return () => {
      observer.disconnect();
      standalone.removeEventListener('change', syncViewport);
      window.removeEventListener('resize', syncViewport);
      window.removeEventListener('orientationchange', syncViewport);
      root.classList.remove('pwa-installed');
      ['--app-scale', '--app-viewport-width', '--app-viewport-height'].forEach(name => root.style.removeProperty(name));
    };
  }, []);
  return null;
}