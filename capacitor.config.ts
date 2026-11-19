import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zaidiinteractive.gasstationsim',
  appName: 'Gas Station Simulator',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#020617',
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
