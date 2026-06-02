import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

export async function getDevicePushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    // Try to get the native device token (FCM on Android) first
    try {
      // getDevicePushTokenAsync returns { type, data }
      // It requires the native app to be configured with FCM (google-services.json)
      // If not configured, it may throw — fall back to Expo token.
      // @ts-ignore
      const nativeToken = await Notifications.getDevicePushTokenAsync();
      if (nativeToken && (nativeToken as any).data) {
        return (nativeToken as any).data as string;
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
