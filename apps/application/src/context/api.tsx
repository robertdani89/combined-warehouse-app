// import { ReactNode, createContext, useCallback, useContext, useMemo } from 'react';
// import { LoginSession } from '../types/auth';
// import { TaskRecord } from '../types/task';

// type LoginResponse = {
//   success: boolean;
// };

// type TokenResponse = {
//   key: string;
//   EXPIRED: number;
//   user: string;
// };

// type UserInfoResponse = {
//   BECENEV: string;
//   szemelykod: string;
// };

// type ApiContextValue = {
//   backendUrl: string;
//   login: (user: string, pass: string) => Promise<LoginSession>;
//   getTasks: (userName: string) => Promise<TaskRecord[]>;
// };

// const ApiContext = createContext<ApiContextValue | undefined>(undefined);

// function formatDate(date: Date): string {
//   const year = date.getFullYear();
//   const month = String(date.getMonth() + 1).padStart(2, '0');
//   const day = String(date.getDate()).padStart(2, '0');
//   return `${year}-${month}-${day}`;
// }

// function normalizeBackendUrl(rawValue: string | undefined): string {
//   const value = (rawValue ?? '').trim();
//   if (!value) {
//     throw new Error('EXPO_PUBLIC_BACKEND_URL is missing. Set it in .env.');
//   }

//   return value.replace(/\/+$/, '');
// }

// async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
//   const response = await fetch(url, {
//     ...init,
//     headers: {
//       'Content-Type': 'application/json',
//       ...(init?.headers ?? {}),
//     },
//   });

//   if (!response.ok) {
//     const errorBody = await response.text();
//     throw new Error(`HTTP ${response.status}: ${errorBody || response.statusText}`);
//   }

//   return (await response.json()) as T;
// }

import { ReactNode, createContext, useCallback, useContext, useMemo } from 'react';
import { LoginSession } from '../types/auth';
import { TaskRecord, TaskItem, ReportTask, ReportItem } from '../types/task';

type LoginResponse = {
  success: boolean;
};

type TokenResponse = {
  key: string;
  EXPIRED: number;
  user: string;
};

type UserInfoResponse = {
  BECENEV: string;
  szemelykod: string;
};

type ApiContextValue = {
  backendUrl: string;
  login: (user: string, pass: string) => Promise<LoginSession>;
  getTasks: (userName: string) => Promise<TaskRecord[]>;
  getTaskItems: (taskId: number) => Promise<TaskItem[]>;
  reportTasks: (tasks: ReportTask[], phoneTime?: string) => Promise<boolean>;
  reportItem: (item: ReportItem, phoneTime?: string) => Promise<boolean>;
  getRoute: (taskId: number) => Promise<string[]>;
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
    throw new Error('EXPO_PUBLIC_BACKEND_URL is missing. Set it in .env.');
  }

  return value.replace(/\/+$/, '');
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorBody || response.statusText}`);
  }

  return (await response.json()) as T;
}

export function ApiProvider({ children }: { children: ReactNode }) {
  const backendUrl = useMemo(
    () => normalizeBackendUrl(process.env.EXPO_PUBLIC_BACKEND_URL),
    [],
  );

  const login = useCallback(
    async (user: string, pass: string): Promise<LoginSession> => {
      const loginResult = await requestJson<LoginResponse>(`${backendUrl}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ user, pass }),
      });

      if (!loginResult.success) {
        throw new Error('Invalid credentials');
      }

      const [tokenResult, userInfo] = await Promise.all([
        requestJson<TokenResponse>(`${backendUrl}/auth/token`, {
          method: 'POST',
          body: JSON.stringify({ userName: user }),
        }),
        requestJson<UserInfoResponse>(
          `${backendUrl}/auth/user-info?userName=${encodeURIComponent(user)}`,
        ),
      ]);

      return {
        uid: userInfo.szemelykod || user,
        name: userInfo.BECENEV || user,
        time: formatDate(new Date()),
        key: tokenResult.key,
        userName: user,
      };
    },
    [backendUrl],
  );

  const getTasks = useCallback(
    async (userName: string): Promise<TaskRecord[]> => {
      const response = await requestJson<TaskRecord[]>(
        `${backendUrl}/tasks?userName=${encodeURIComponent(userName)}`,
      );

      return response;
    },
    [backendUrl],
  );

  const getTaskItems = useCallback(
    async (taskId: number): Promise<TaskItem[]> => {
      const response = await requestJson<TaskItem[]>(
        `${backendUrl}/tasks/${taskId}/items`,
      );

      return response;
    },
    [backendUrl],
  );

  const reportTasks = useCallback(
    async (tasks: ReportTask[], phoneTime?: string): Promise<boolean> => {
      const result = await requestJson<{ success: boolean }>(
        `${backendUrl}/tasks/report`,
        {
          method: 'POST',
          body: JSON.stringify({ tasks, phoneTime }),
        },
      );

      return result.success;
    },
    [backendUrl],
  );

  const reportItem = useCallback(
    async (item: ReportItem, phoneTime?: string): Promise<boolean> => {
      const result = await requestJson<{ success: boolean }>(
        `${backendUrl}/tasks/report-item`,
        {
          method: 'PUT',
          body: JSON.stringify({ item, phoneTime }),
        },
      );

      return result.success;
    },
    [backendUrl],
  );

  const getRoute = useCallback(
    async (taskId: number): Promise<string[]> => {
      const result = await requestJson<{ route: string[] }>(
        `${backendUrl}/tasks/${taskId}/route`,
      );

      return result.route;
    },
    [backendUrl],
  );

  const value = useMemo<ApiContextValue>(
    () => ({ backendUrl, login, getTasks, getTaskItems, reportTasks, reportItem, getRoute }),
    [backendUrl, getTasks, getTaskItems, reportTasks, reportItem, getRoute, login],
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
