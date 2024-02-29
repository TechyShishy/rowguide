import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.techyshishy.rowguide',
  appName: 'Rowguide',
  webDir: 'dist/rowguide/browser',
  server: {
    androidScheme: 'https',
  },
};

export default config;
