import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.monpetitpotager.app',
  appName: 'Mon petit potager',
  webDir: 'dist',
  backgroundColor: '#EAF2E3',
  plugins: {
    SplashScreen: { launchShowDuration: 800, backgroundColor: '#EAF2E3', showSpinner: false },
    StatusBar: { style: 'DARK', backgroundColor: '#EAF2E3', overlaysWebView: false }
  }
};

export default config;
