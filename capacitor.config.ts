import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const rawServerUrl = process.env.CAPACITOR_SERVER_URL?.trim();
const allowCleartext = process.env.CAPACITOR_ALLOW_CLEARTEXT === 'true';

const hasValidHttpsUrl = Boolean(rawServerUrl && rawServerUrl.startsWith('https://'));
const hasAllowedDevHttpUrl = Boolean(
  allowCleartext && rawServerUrl && rawServerUrl.startsWith('http://')
);

const serverConfig: CapacitorConfig['server'] =
  hasValidHttpsUrl || hasAllowedDevHttpUrl
    ? {
        url: rawServerUrl,
        cleartext: hasAllowedDevHttpUrl,
        androidScheme: 'https',
        errorPath: 'index.html',
      }
    : {
        androidScheme: 'https',
        iosScheme: 'capacitor',
        errorPath: 'index.html',
      };

const config: CapacitorConfig = {
  appId: 'ro.hai.app',
  appName: 'HAI.',
  webDir: 'mobile-shell',
  backgroundColor: '#FAFAF9',
  loggingBehavior: process.env.CAPACITOR_DEBUG === 'true' ? 'debug' : 'production',
  server: serverConfig,
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: process.env.CAPACITOR_DEBUG === 'true',
    backgroundColor: '#FAFAF9',
    buildOptions: {
      releaseType: 'AAB',
      signingType: 'apksigner',
    },
  },
  ios: {
    scheme: 'App',
    contentInset: 'always',
    limitsNavigationsToAppBoundDomains: false,
    backgroundColor: '#FAFAF9',
  },
  plugins: {
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
      style: 'DEFAULT',
    },
    Keyboard: {
      resize: KeyboardResize.Body,
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 0,
      backgroundColor: '#FAFAF9',
      showSpinner: false,
    },
  },
};

export default config;
