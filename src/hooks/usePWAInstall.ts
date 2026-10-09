import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const SHARED_APP_URL = 'https://ais-pre-pheboys4xza5rvsng6x2sj-320941968238.asia-southeast1.run.app';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined' && (window as any).__deferredPWAInstallPrompt) {
      return (window as any).__deferredPWAInstallPrompt as BeforeInstallPromptEvent;
    }
    return null;
  });
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect if page is running inside an iframe (like AI Studio preview)
    const inIframe = window.self !== window.top;
    setIsInIframe(inIframe);

    // Check if already running in standalone PWA app window
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://') ||
      window.location.search.includes('source=pwa') ||
      localStorage.getItem('coolhome_pwa_installed') === 'true';

    setIsInstalled(isStandalone);

    // Detect device type
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    const android = /android/.test(ua);
    setIsIOS(ios);
    setIsAndroid(android);

    // Check pre-captured prompt from index.html
    if ((window as any).__deferredPWAInstallPrompt) {
      setDeferredPrompt((window as any).__deferredPWAInstallPrompt);
      setCanPrompt(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      const promptEvent = e as BeforeInstallPromptEvent;
      (window as any).__deferredPWAInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
      setCanPrompt(true);
    };

    const handlePromptReady = (e: any) => {
      if (e.detail) {
        setDeferredPrompt(e.detail as BeforeInstallPromptEvent);
        setCanPrompt(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      localStorage.setItem('coolhome_pwa_installed', 'true');
      setDeferredPrompt(null);
      (window as any).__deferredPWAInstallPrompt = null;
      setCanPrompt(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-ready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unsupported'> => {
    const promptEvent = deferredPrompt || (window as any).__deferredPWAInstallPrompt;
    if (!promptEvent) {
      return 'unsupported';
    }

    try {
      await promptEvent.prompt();
      const choiceResult = await promptEvent.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        localStorage.setItem('coolhome_pwa_installed', 'true');
        setDeferredPrompt(null);
        (window as any).__deferredPWAInstallPrompt = null;
        setCanPrompt(false);
        return 'accepted';
      }
      return 'dismissed';
    } catch (err) {
      console.error('PWA install prompt error:', err);
      return 'unsupported';
    }
  }, [deferredPrompt]);

  const currentUrl = typeof window !== 'undefined' ? window.location.href : SHARED_APP_URL;

  return {
    isInstallable: canPrompt || !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    isInIframe,
    install,
    sharedAppUrl: SHARED_APP_URL,
    appUrl: currentUrl,
    deferredPrompt,
  };
}
