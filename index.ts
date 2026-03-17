import { registerRootComponent } from 'expo';

import App from './App';

// Initialize LiveKit's WebRTC globals when running in a dev/prod build.
// This is a no-op in Expo Go (native module not available).
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { registerGlobals } = require('@livekit/react-native') as { registerGlobals: () => void };
  registerGlobals();
} catch {
  // Running in Expo Go — LiveKit video unavailable, rest of app works normally.
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
