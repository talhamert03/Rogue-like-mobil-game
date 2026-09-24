import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.deckdelver.game',
  appName: 'Deckdelver',
  webDir: 'dist',
  backgroundColor: '#120c18',
  android: {
    allowMixedContent: false,
    backgroundColor: '#120c18',
  },
};

export default config;
