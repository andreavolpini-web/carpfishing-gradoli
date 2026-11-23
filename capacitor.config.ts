import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'it.carpfishinggradoli.app',
  appName: 'Carpfishing Gradoli',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0f766e',
      showSpinner: false,
    },
  },
};

export default config;
