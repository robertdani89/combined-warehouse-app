import { ReactNode, createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginSession } from '../types/auth';
import { TaskRecord, TaskItem, ReportTask, ReportItem, TaskMessage } from '../types/task';

type LoginResponse = {
  success: boolean;
};

type TokenResponse = {
  key: string;
  EXPIRED: number;
  user: string;
};

type TokenPayload = {
  user: string;
  szemelykod: string;
  nickName: string;
  exp: number;
};

type ApiContextValue = {
  backendUrl: string;
  login: (user: string, pass: string) => Promise<LoginSession>;
  getTasks: (userName: string) => Promise<TaskRecord[]>;
  getTaskItems: (taskId: number) => Promise<TaskItem[]>;
  reportTasks: (tasks: ReportTask[], phoneTime?: string) => Promise<boolean>;
  reportItem: (item: ReportItem, phoneTime?: string) => Promise<boolean>;
  getRoute: (taskId: number) => Promise<string[]>;
  getUzenetek: (taskId: number, userName: string) => Promise<TaskMessage[]>;
  postUzenet: (taskId: number, userName: string, message: string) => Promise<boolean>;
  hasVegezIdo: (userName: string) => Promise<boolean>;
  saveVegzes: (userName: string, idoString: string) => Promise<boolean>;
  saveFirebaseToken: (userName: string, key: string) => Promise<boolean>;
  searchInventory: (leiras: string, id?: number) => Promise<any[]>;
};

const ApiContext = createContext<ApiContextValue | undefined>(undefined);

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeBackendUrl(rawValue: string | undefined): string {
  const value = (rawValue ?? '').trim();
  if (!value) {
    return '';
  }
  return value.replace(/\/+$/, '');
}

const PRIMARY_URL = normalizeBackendUrl(process.env.EXPO_PUBLIC_BACKEND_URL);
if (!PRIMARY_URL) {
  throw new Error('EXPO_PUBLIC_BACKEND_URL is missing. Set it in .env.');
}

const SECONDARY_URL = normalizeBackendUrl(process.env.EXPO_PUBLIC_BACKEND_SECONDARY_URL);

let activeBackendUrl: string | null = null;
let ongoingCheckPromise: Promise<string> | null = null;

type ActiveUrlListener = (url: string) => void;
const listeners = new Set<ActiveUrlListener>();

function notifyListeners(url: string) {
  for (const listener of listeners) {
    listener(url);
  }
}

async function pingUrl(url: string, timeoutMs = 2500): Promise<boolean> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${url}/`, { signal: controller.signal });
    clearTimeout(id);
    return res.ok;
  } catch (error: any) {
    if (!controller.signal.aborted) {
      console.error(`Error pinging ${url}`);
      console.error(JSON.stringify(error, null, 2) || error.message || error);
    }
    clearTimeout(id);
    return false;
  }
}

async function discoverActiveUrl(): Promise<string> {
  if (!SECONDARY_URL) {
    return PRIMARY_URL;
  }

  try {
    const [primaryOk, secondaryOk] = await Promise.all([
      pingUrl(PRIMARY_URL),
      pingUrl(SECONDARY_URL),
    ]);

    if (primaryOk) {
      console.log(`Primary backend URL is active: ${PRIMARY_URL}`);
      return PRIMARY_URL;
    }
    if (secondaryOk) {
      console.log(`Secondary backend URL is active: ${SECONDARY_URL}`);
      return SECONDARY_URL;
    }
  } catch {
    console.error('Error during backend URL discovery');
  }

  console.warn('Both backend URLs are unreachable, defaulting to primary URL');
  return PRIMARY_URL;
}

async function getActiveUrl(forceRecheck = false): Promise<string> {
  if (activeBackendUrl && !forceRecheck) {
    return activeBackendUrl;
  }

  if (ongoingCheckPromise) {
    return ongoingCheckPromise;
  }

  ongoingCheckPromise = discoverActiveUrl()
    .then((url) => {
      activeBackendUrl = url;
      notifyListeners(url);
      ongoingCheckPromise = null;
      return url;
    })
    .catch(() => {
      activeBackendUrl = PRIMARY_URL;
      notifyListeners(PRIMARY_URL);
      ongoingCheckPromise = null;
      return PRIMARY_URL;
    });

  return ongoingCheckPromise;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

async function makeFetchAttempt<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  let authHeader = {};
  try {
    const saved = await AsyncStorage.getItem('@villumen_login_session');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.key) {
        authHeader = { 'Authorization': `Bearer ${parsed.key}` };
      }
    }
  } catch {
    // Ignore error, request without auth
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${baseUrl}${cleanPath}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new HttpError(response.status, errorBody || response.statusText);
  }

  return (await response.json()) as T;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let activeUrl = await getActiveUrl();

  try {
    return await makeFetchAttempt<T>(activeUrl, path, init);
  } catch (error) {
    // if (error instanceof HttpError) {
    //   throw error;
    // }

    const originalError = error;
    try {
      activeUrl = await getActiveUrl(true);
    } catch {
      throw originalError;
    }

    return await makeFetchAttempt<T>(activeUrl, path, init);
  }
}

export function ApiProvider({ children }: { children: ReactNode }) {
  const [backendUrl, setBackendUrl] = useState<string>(activeBackendUrl || PRIMARY_URL);

  useEffect(() => {
    listeners.add(setBackendUrl);
    if (!activeBackendUrl) {
      getActiveUrl().catch(() => { });
    }
    return () => {
      listeners.delete(setBackendUrl);
    };
  }, []);

  const login = useCallback(
    async (user: string, pass: string): Promise<LoginSession> => {

      const loginResult = await requestJson<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ user, pass }),
      });

      if (!loginResult.success) {
        throw new Error('Invalid credentials');
      }

      const tokenResult = await
        requestJson<TokenResponse>('/auth/token', {
          method: 'POST',
          body: JSON.stringify({ userName: user }),
        }
        );

      const token = tokenResult.key;
      const decoded = decodeToken(token);

      return {
        uid: decoded?.szemelykod ?? '',
        name: decoded?.nickName ?? '',
        time: formatDate(new Date()),
        key: tokenResult.key,
        userName: user,
      };
    },
    [],
  );

  const decodeToken = useCallback(
    (token: string): TokenPayload | null => {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1])) as TokenPayload;
        return decoded;
      } catch {
        return null;
      }
    },
    [],
  );

  const getTasks = useCallback(
    async (userName: string): Promise<TaskRecord[]> => {
      const response = await requestJson<TaskRecord[]>(
        `/tasks?userName=${encodeURIComponent(userName)}`,
      );

      return response;
    },
    [],
  );

  const getTaskItems = useCallback(
    async (taskId: number): Promise<TaskItem[]> => {
      const response = await requestJson<TaskItem[]>(
        `/tasks/${taskId}/items`,
      );

      return response;
    },
    [],
  );

  const reportTasks = useCallback(
    async (tasks: ReportTask[], phoneTime?: string): Promise<boolean> => {
      const result = await requestJson<{ success: boolean }>(
        '/tasks/report',
        {
          method: 'POST',
          body: JSON.stringify({ tasks, phoneTime }),
        },
      );

      return result.success;
    },
    [],
  );

  const reportItem = useCallback(
    async (item: ReportItem, phoneTime?: string): Promise<boolean> => {
      const result = await requestJson<{ success: boolean }>(
        '/tasks/report-item',
        {
          method: 'PUT',
          body: JSON.stringify({ item, phoneTime }),
        },
      );

      return result.success;
    },
    [],
  );

  const getRoute = useCallback(
    async (taskId: number): Promise<string[]> => {
      const result = await requestJson<{ route: string[] }>(
        `/tasks/${taskId}/route`,
      );

      return result.route;
    },
    [],
  );

  const getUzenetek = useCallback(
    async (taskId: number, userName: string): Promise<TaskMessage[]> => {
      const result = await requestJson<TaskMessage[]>(
        `/messages/task/${taskId}/with-seen?userName=${encodeURIComponent(userName)}`,
      );
      return result;
    },
    [],
  );

  const postUzenet = useCallback(
    async (taskId: number, userName: string, message: string): Promise<boolean> => {
      const result = await requestJson<{ success: boolean }>(
        '/messages',
        {
          method: 'POST',
          body: JSON.stringify({ feladatId: taskId, userName, message }),
        },
      );
      return result.success;
    },
    [],
  );

  const hasVegezIdo = useCallback(
    async (userName: string): Promise<boolean> => {
      const result = await requestJson<{ van: boolean }>(
        `/client/has-vegez-ido?userName=${encodeURIComponent(userName)}`,
      );
      return result.van;
    },
    [],
  );

  const saveVegzes = useCallback(
    async (userName: string, idoString: string): Promise<boolean> => {
      const result = await requestJson<{ success: boolean }>(
        '/client/save-vegzes',
        {
          method: 'POST',
          body: JSON.stringify({ uid: userName, idoString }),
        },
      );
      return result.success;
    },
    [],
  );

  const saveFirebaseToken = useCallback(
    async (userName: string, key: string): Promise<boolean> => {
      const result = await requestJson<{ success: boolean }>(
        '/client/firebase-token',
        {
          method: 'POST',
          body: JSON.stringify({ userName, key }),
        },
      );
      return result.success;
    },
    [],
  );

  const searchInventory = useCallback(
    async (leiras: string, id?: number): Promise<any[]> => {
      const q = `?feladatId=${encodeURIComponent(String(id ?? -1))}&leiras=${encodeURIComponent(leiras)}`;
      const result = await requestJson<any[]>(
        `/search${q}`,
      );

      return result;
    },
    [],
  );

  const value = useMemo<ApiContextValue>(
    () => ({
      backendUrl,
      login,
      getTasks,
      getTaskItems,
      reportTasks,
      reportItem,
      getRoute,
      getUzenetek,
      postUzenet,
      hasVegezIdo,
      saveVegzes,
      saveFirebaseToken,
      searchInventory,
    }),
    [backendUrl, getTasks, getTaskItems, reportTasks, reportItem, getRoute, getUzenetek, postUzenet, login, hasVegezIdo, saveVegzes],
  );

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApi(): ApiContextValue {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used inside ApiProvider.');
  }

  return context;
}
