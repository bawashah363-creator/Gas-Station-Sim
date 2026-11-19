/**
 * Android Fullscreen & Landscape Orientation Controller
 * Supports native Android WebView JS bridges, TWA/Capacitor wrappers,
 * and standard browser Fullscreen + ScreenOrientation APIs.
 */

export interface AndroidBridge {
  enterImmersiveMode?: () => void;
  exitImmersiveMode?: () => void;
  lockLandscape?: () => void;
}

declare global {
  interface Window {
    AndroidInterface?: AndroidBridge;
    Android?: AndroidBridge;
  }
}

export function isFullscreenActive(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
  };
  return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
}

export function isPortraitViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerHeight > window.innerWidth && window.innerWidth < 900;
}

export function notifyAndroidImmersive(enable: boolean): void {
  const bridge = window.AndroidInterface || window.Android;
  try {
    if (enable) {
      bridge?.enterImmersiveMode?.();
      bridge?.lockLandscape?.();
    } else {
      bridge?.exitImmersiveMode?.();
    }
  } catch {
    // Ignore if bridge is unavailable in browser preview
  }
}

export async function enterFullscreenLandscape(): Promise<boolean> {
  notifyAndroidImmersive(true);

  if (typeof document === 'undefined') return false;
  const root = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: (options?: FullscreenOptions) => Promise<void>;
  };

  try {
    if (!isFullscreenActive()) {
      if (root.requestFullscreen) {
        await root.requestFullscreen({ navigationUI: 'hide' });
      } else if (root.webkitRequestFullscreen) {
        await root.webkitRequestFullscreen();
      }
    }
  } catch {
    // Browser may deny fullscreen without user gesture or inside restricted iframe
  }

  try {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (orientation: string) => Promise<void>;
    };
    if (orientation && typeof orientation.lock === 'function') {
      await orientation.lock('landscape');
    }
  } catch {
    // Orientation lock is only allowed in fullscreen or installed PWA/Android wrapper
  }

  return isFullscreenActive();
}

export async function exitFullscreenMode(): Promise<void> {
  notifyAndroidImmersive(false);

  if (typeof document === 'undefined') return;
  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void>;
  };

  try {
    if (isFullscreenActive()) {
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      }
    }
  } catch {
    // Ignore exit errors
  }
}

export async function toggleFullscreenLandscape(): Promise<boolean> {
  if (isFullscreenActive()) {
    await exitFullscreenMode();
    return false;
  }
  return enterFullscreenLandscape();
}
