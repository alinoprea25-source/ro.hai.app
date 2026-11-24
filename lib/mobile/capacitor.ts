import { Capacitor, type PluginListenerHandle } from '@capacitor/core';

export type MobilePlatform = 'android' | 'ios' | 'web';

export function isNativeCapacitor(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function getMobilePlatform(): MobilePlatform {
  if (typeof window === 'undefined') return 'web';
  try {
    const p = Capacitor.getPlatform();
    if (p === 'android' || p === 'ios') return p;
    return 'web';
  } catch {
    return 'web';
  }
}

export async function syncNativeSystemUI(theme: 'light' | 'dark'): Promise<void> {
  if (!isNativeCapacitor()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({
      style: theme === 'dark' ? Style.Dark : Style.Light,
    });
    if (getMobilePlatform() === 'android') {
      try {
        await StatusBar.setBackgroundColor({
          color: theme === 'dark' ? '#0E0F12' : '#FAFAF9',
        });
      } catch {
        // Ignored on Android 15+ edge-to-edge where status bar background color is deprecated
      }
    }
  } catch {
    // Ignore when plugin isn't present in current web runtime
  }
}

let splashHidden = false;

export async function hideNativeSplash(): Promise<void> {
  if (splashHidden || !isNativeCapacitor()) return;
  splashHidden = true;
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {
    // Ignore when SplashScreen plugin isn't active
  }
}

export function registerKeyboardObservers(
  onKeyboardStateChange?: (state: { isOpen: boolean; height: number }) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handles: PluginListenerHandle[] = [];
  let disposed = false;

  const applyKeyboardState = (isOpen: boolean, height: number) => {
    const root = document.documentElement;
    root.dataset.keyboardOpen = isOpen ? 'true' : 'false';
    root.style.setProperty('--hai-keyboard-height', `${Math.max(0, Math.round(height))}px`);
    onKeyboardStateChange?.({ isOpen, height: Math.max(0, Math.round(height)) });

    if (isOpen && document.activeElement instanceof HTMLElement) {
      const tag = document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        requestAnimationFrame(() => {
          document.activeElement?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        });
      }
    }
  };

  if (isNativeCapacitor()) {
    void (async () => {
      try {
        const { Keyboard } = await import('@capacitor/keyboard');
        if (disposed) return;

        handles.push(
          await Keyboard.addListener('keyboardWillShow', (info) => {
            applyKeyboardState(true, info.keyboardHeight);
          })
        );
        handles.push(
          await Keyboard.addListener('keyboardDidShow', (info) => {
            applyKeyboardState(true, info.keyboardHeight);
          })
        );
        handles.push(
          await Keyboard.addListener('keyboardWillHide', () => {
            applyKeyboardState(false, 0);
          })
        );
        handles.push(
          await Keyboard.addListener('keyboardDidHide', () => {
            applyKeyboardState(false, 0);
          })
        );
      } catch {
        // Fallback handled below
      }
    })();
  }

  // Fallback for Android Chrome / WebView visualViewport changes
  const vv = window.visualViewport;
  const baselineHeight = window.innerHeight;
  const handleViewportResize = () => {
    if (!vv) return;
    const diff = baselineHeight - vv.height;
    const isLikelyKeyboard = diff > 140;
    if (!isNativeCapacitor()) {
      applyKeyboardState(isLikelyKeyboard, isLikelyKeyboard ? diff : 0);
    }
  };

  vv?.addEventListener('resize', handleViewportResize);

  return () => {
    disposed = true;
    vv?.removeEventListener('resize', handleViewportResize);
    applyKeyboardState(false, 0);
    for (const handle of handles) {
      void handle.remove().catch(() => {});
    }
  };
}

export function registerAndroidBackHandler(
  onBackPressed: () => boolean | Promise<boolean>
): () => void {
  if (getMobilePlatform() !== 'android') return () => {};

  let handle: PluginListenerHandle | null = null;
  let disposed = false;

  void (async () => {
    try {
      const { App } = await import('@capacitor/app');
      if (disposed) return;
      handle = await App.addListener('backButton', () => {
        void onBackPressed();
      });
    } catch {
      // Ignore if App plugin isn't loaded
    }
  })();

  return () => {
    disposed = true;
    if (handle) {
      void handle.remove().catch(() => {});
    }
  };
}

export async function exitAndroidApp(): Promise<void> {
  if (getMobilePlatform() !== 'android') return;
  try {
    const { App } = await import('@capacitor/app');
    await App.exitApp();
  } catch {
    // Ignore
  }
}
