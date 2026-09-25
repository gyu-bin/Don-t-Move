/**
 * iOS 27 aborts at launch unless the app adopts the UIScene life cycle.
 * Expo SDK 57 ships `ExpoAppSceneDelegate` (ObjC name EXExpoAppSceneDelegate)
 * but the prebuild template still starts React Native from the AppDelegate.
 *
 * This plugin:
 *  - registers the Expo scene delegate in Info.plist
 *  - makes AppDelegate an ExpoReactNativeFactoryProvider
 *  - lets the scene delegate (not AppDelegate) create the window and start RN
 *
 * Remove once the Expo template adopts scenes itself.
 */
const { withAppDelegate, withInfoPlist } = require('@expo/config-plugins');

const START_BLOCK =
  /#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;

module.exports = function withSceneLifecycle(config) {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
          },
        ],
      },
    };
    return cfg;
  });

  config = withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') {
      throw new Error('withSceneLifecycle expects a Swift AppDelegate');
    }
    let src = cfg.modResults.contents;
    if (!src.includes('ExpoReactNativeFactoryProvider')) {
      src = src.replace(
        'class AppDelegate: ExpoAppDelegate {',
        'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {',
      );
    }
    if (START_BLOCK.test(src)) {
      src = src.replace(
        START_BLOCK,
        '    // Window + React Native start are owned by ExpoAppSceneDelegate.\n',
      );
    } else if (src.includes('UIWindow(frame: UIScreen.main.bounds)')) {
      throw new Error('withSceneLifecycle could not patch AppDelegate start block');
    }
    cfg.modResults.contents = src;
    return cfg;
  });

  return config;
};
