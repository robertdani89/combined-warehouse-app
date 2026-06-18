import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ApiProvider } from '../src/context/api';
import { AuthProvider, useAuth } from '../src/context/auth';

function AuthGuardedLayout() {
  const { session, isBooting } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const statusBarStyle = colorScheme === 'dark' ? 'light' : 'dark';

  useEffect(() => {
    if (isBooting) return;

    const isOnLoginPage = (segments as string[]).length === 0;

    if (!session && !isOnLoginPage) {
      router.replace('/');
    } else if (session && isOnLoginPage) {
      router.replace('/feladatok');
    }
  }, [session, isBooting, segments, router]);

  if (isBooting) {
    return (
      <SafeAreaView style={[styles.loadingScreen, colorScheme === 'dark' && styles.loadingScreenDark]}>
        <ActivityIndicator size="large" color="#064E3B" />
        <Text style={styles.loadingText}>Bejelentkezes ellenorzese...</Text>
        <StatusBar style={statusBarStyle} />
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style={statusBarStyle} />
    </>
  );
}

export default function RootLayout() {
  return (
    <ApiProvider>
      <AuthProvider>
        <AuthGuardedLayout />
      </AuthProvider>
    </ApiProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingScreenDark: {
    backgroundColor: '#0F172A',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#064E3B',
  },
});
