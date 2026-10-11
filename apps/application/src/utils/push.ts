import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Show notifications while the app is in the foreground instead of silently dropping them.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

async function ensurePermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

/**
 * Registers the device for push notifications and returns an Expo push token.
 * The backend forwards messages sent to this token through Expo's push service,
 * which relays to FCM/APNs on our behalf (avoiding the deprecated legacy FCM
 * HTTP API that notifyRaktaros.php relied on).
 * Returns null when running on a simulator/emulator or when permission is denied.
 */
export async function getDevicePushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;

    const granted = await ensurePermission();
    if (!granted) return null;

    await ensureAndroidChannel();

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    try {
      const expoToken = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      );
      return expoToken.data;
    } catch {
      // Fall back to the native FCM device token if the Expo token can't be obtained.
    }

    try {
      const nativeToken = await Notifications.getDevicePushTokenAsync();
      return (nativeToken?.data as string) ?? null;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

export default getDevicePushToken;
