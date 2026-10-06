import 'react-native-gesture-handler';
import 'react-native-reanimated';

import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';

import { markStartup } from './src/ui/branding/startupMetrics';

markStartup('entry');
if (__DEV__) {
  // Keep development notifications out of the game; logs remain in DevTools.
  LogBox.ignoreAllLogs();
  const {motionSnapshot}=require('./src/ui/branding/motionDiagnostics');
  Object.assign(globalThis,{dontMoveMotion:motionSnapshot});
  void motionSnapshot().then((value:unknown)=>markStartup('motion-preference',value))
    .catch((error:unknown)=>markStartup('motion-preference-read-failed',String(error)));
}
const App = require('./App').default;
markStartup('app-module-ready');

registerRootComponent(App);
