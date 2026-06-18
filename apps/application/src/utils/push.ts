import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

export async function getDevicePushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;

    const existing = await Notifications.getPermissionsAsync();
    let finalGranted = false;

    if ('status' in existing) {
      finalGranted = existing.status === 'granted';
    } else if ('granted' in existing) {
      finalGranted = Boolean((existing as any).granted);
    }

    if (!finalGranted) {
      const requested = await Notifications.requestPermissionsAsync();
      if ('status' in requested) {
        finalGranted = requested.status === 'granted';
      } else if ('granted' in requested) {
        finalGranted = Boolean((requested as any).granted);
      }
    }

    if (!finalGranted) return null;

    // Try to get the native FCM device token first.
    // Requires google-services.json to be configured in android/app/.
    try {
      const nativeToken = await Notifications.getDevicePushTokenAsync();
      if (nativeToken?.data) {
        return nativeToken.data as string;
      }
    } catch (e) {
      // ignore and fallback
    }

    // Fallback to Expo push token
    try {
      const expoToken = await Notifications.getExpoPushTokenAsync();
      return expoToken.data;
    } catch (e) {
      return null;
    }
  } catch (err) {
    return null;
  }
}

export default getDevicePushToken;
