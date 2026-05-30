import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text } from 'react-native';
import { Navigate, Route, Routes } from 'react-router';
import LoginScreen from './src/components/LoginScreen';
import TasksScreen from './src/components/TasksScreen';
import TaskDetailScreen from './src/components/TaskDetailScreen';
import FinishedTasksScreen from './src/components/FinishedTasksScreen';
import { ApiProvider } from './src/context/api';
import RootRouter from './src/router/RootRouter';
import { LoginSession } from './src/types/auth';

const LOGIN_SESSION_KEY = '@villumen_login_session';

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function App() {
  const [isBooting, setIsBooting] = useState(true);
  const [session, setSession] = useState<LoginSession | null>(null);

  const today = useMemo(() => formatDate(new Date()), []);

  const loadExistingSession = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(LOGIN_SESSION_KEY);
      if (!saved) {
        setSession(null);
        return;
      }

      const parsed = JSON.parse(saved) as Partial<LoginSession>;
      if (parsed.time === today && parsed.uid && parsed.name) {
        setSession(parsed as LoginSession);
      } else {
        await AsyncStorage.removeItem(LOGIN_SESSION_KEY);
        setSession(null);
      }
    } catch {
      await AsyncStorage.removeItem(LOGIN_SESSION_KEY);
      setSession(null);
    } finally {
      setIsBooting(false);
    }
  }, [today]);

  useEffect(() => {
    loadExistingSession();
  }, [loadExistingSession]);

  const handleResetAllData = useCallback(async () => {
    await AsyncStorage.clear();
    setSession(null);
  }, []);

  const handleLoginSuccess = useCallback(async (newSession: LoginSession) => {
    await AsyncStorage.setItem(LOGIN_SESSION_KEY, JSON.stringify(newSession));
    setSession(newSession);
  }, []);

  const handleLogout = useCallback(async () => {
    await AsyncStorage.removeItem(LOGIN_SESSION_KEY);
    setSession(null);
  }, []);

  if (isBooting) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#064E3B" />
        <Text style={styles.loadingText}>Bejelentkezes ellenorzese...</Text>
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  return (
    <ApiProvider>
      <RootRouter>
        <SafeAreaView style={styles.safeArea}>
          <Routes>
            <Route
              path="/"
              element={
                session ? (
                  <Navigate to="/feladatok" replace />
                ) : (
                  <LoginScreen
                    onLoginSuccess={handleLoginSuccess}
                    onResetAllData={handleResetAllData}
                  />
                )
              }
            />
            <Route
              path="/feladatok"
              element={
                session ? (
                  <TasksScreen onLogout={handleLogout} session={session} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="/feladat/:id"
              element={
                session ? (
                  <TaskDetailScreen session={session} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="/lezart-feladatok"
              element={
                session ? (
                  <FinishedTasksScreen session={session} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="*"
              element={<Navigate to={session ? '/feladatok' : '/'} replace />}
            />
          </Routes>
          <StatusBar style="dark" />
        </SafeAreaView>
      </RootRouter>
    </ApiProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E2E8F0',
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    gap: 12,
  },
  loadingText: {
    color: '#334155',
    fontSize: 15,
  },
});
