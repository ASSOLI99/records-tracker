// Applies only the Android half of the expo-widgets config plugin.
//
// The full plugin also adds an iOS widget extension and an App Group to the iOS project. iOS
// widgets need their own SwiftUI layout and Apple signing set up, so until that exists the iOS
// project is left untouched.
const withAndroidWidgets = require('expo-widgets/plugin/build/android/withAndroidWidgets').default;

module.exports = function withRecordsTrackerWidgets(config, props = {}) {
  return withAndroidWidgets(config, { enablePushNotifications: false, ...props, widgets: props.widgets ?? [] });
};
