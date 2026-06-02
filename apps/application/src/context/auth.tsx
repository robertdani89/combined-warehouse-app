import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginSession } from '../types/auth';

const LOGIN_SESSION_KEY = '@villumen_login_session';

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface AuthContextValue {
  session: LoginSession | null;
  isBooting: boolean;
  handleLoginSuccess: (session: LoginSession) => Promise<void>;
  handleLogout: () => Promise<void>;
  handleResetAllData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
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

  const handleLoginSuccess = useCallback(async (newSession: LoginSession) => {
    await AsyncStorage.setItem(LOGIN_SESSION_KEY, JSON.stringify(newSession));
    setSession(newSession);
  }, []);

  const handleLogout = useCallback(async () => {
    await AsyncStorage.removeItem(LOGIN_SESSION_KEY);
    setSession(null);
  }, []);

  const handleResetAllData = useCallback(async () => {
    await AsyncStorage.clear();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, isBooting, handleLoginSuccess, handleLogout, handleResetAllData }),
    [session, isBooting, handleLoginSuccess, handleLogout, handleResetAllData]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
