import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Animated } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApi } from '../context/api';
import { TaskRecord, TaskItem, ReportItem } from '../types/task';
import { LoginSession } from '../types/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../theme/theme';

import InventoryTask from './task-types/InventoryTask';
import MovementTask from './task-types/MovementTask';
import OtherTask from './task-types/OtherTask';
import ReceivingTask from './task-types/ReceivingTask';
import PickingTask from './task-types/PickingTask';
import { ExtraButton } from './task-types/TaskRunnerProps';

interface TaskDetailScreenProps {
  session: LoginSession;
}

type InitialProgress = Record<number, { allapot: number; mennyiseg?: number; megjegyzes?: string }>;
// `synced` marks whether this item's finding was actually confirmed sent to the backend.
// Items saved locally but not yet synced (e.g. because the network dropped while roaming
// between routers) must stay eligible for resend — they must never be treated as reported.
type PersistedProgress = Record<number, { allapot: number; mennyiseg?: number; megjegyzes?: string; ido?: string; synced?: boolean }>;

function getCurrentTimeString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export default function TaskDetailScreen({ session }: TaskDetailScreenProps) {
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getTasks, getTaskItems, reportItem } = useApi();

  const isFocused = useIsFocused();

  const [task, setTask] = useState<TaskRecord | null>(null);
  const [items, setItems] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialProgress, setInitialProgress] = useState<InitialProgress>({});
  const [extraButtons, setExtraButtons] = useState<ExtraButton[]>([]);

  const taskId = useMemo(() => (id ? parseInt(id, 10) : NaN), [id]);

  const blinkAnim = useRef(new Animated.Value(1)).current;
  // Tracks which item states were CONFIRMED sent to the backend (synced === true), so
  // re-saving unchanged items (merged in from progress) doesn't re-report them. Items that
  // failed to send (e.g. a dropped connection while roaming between routers) must never
  // end up in here, otherwise they'd be silently dropped instead of retried.
  const lastReportedRef = useRef<InitialProgress>({});
  // Tracks the actual moment each item was completed, so a later auto-report doesn't overwrite it with the report time
  const itemTimestampsRef = useRef<Record<number, string>>({});
  // Full locally-persisted progress (including each item's synced flag), kept in sync with
  // AsyncStorage so partial updates (e.g. marking a single item as synced) never clobber the
  // rest of the saved findings.
  const persistedProgressRef = useRef<PersistedProgress>({});

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: colors.background,
    },
    centerContainer: {
      backgroundColor: colors.background,
    },
    infoText: {
      color: colors.textSecondary,
    },
    errorText: {
      color: colors.danger,
    },
    retryBtn: {
      backgroundColor: colors.primary,
    },
    retryBtnTxt: {
      color: colors.textOnPrimary,
    },
    cancelBtn: {
      backgroundColor: colors.secondary,
    },
    chatBtn: {
      backgroundColor: colors.primary,
    },
    footerButtons: {
      backgroundColor: colors.cardBackground,
      borderTopColor: colors.border,
    },
  });

  // Updates the synced flag for the given items in the in-memory + persisted progress map,
  // without touching any other item's saved data.
  const persistSyncedFlags = useCallback(
    async (itemIds: number[], synced: boolean) => {
      if (itemIds.length === 0) return;
      for (const itemId of itemIds) {
        const existing = persistedProgressRef.current[itemId];
        if (existing) {
          persistedProgressRef.current[itemId] = { ...existing, synced };
        }
      }
      try {
        await AsyncStorage.setItem(`task_progress_${taskId}`, JSON.stringify(persistedProgressRef.current));
      } catch {
        // Ignore persistence errors; the next save/resync attempt will retry
      }
    },
    [taskId]
  );

  // Sends the given entries to the backend and marks only the ones that actually succeed as
  // synced. Entries that fail (e.g. the connection drops while roaming between routers) stay
  // unsynced locally so they get resent later instead of being silently discarded.
  const reportEntries = useCallback(
    async (
      entries: [string, { allapot: number; mennyiseg?: number; megjegyzes?: string }][],
      itemsList: TaskItem[]
    ) => {
      if (entries.length === 0) return;

      const now = getCurrentTimeString();
      const results = await Promise.allSettled(
        entries.map(([itemIdStr, info]) => {
          const itemId = parseInt(itemIdStr, 10);
          const orig = itemsList.find((i) => i._id === itemId);
          const time = itemTimestampsRef.current[itemId] ?? now;
          const item: ReportItem = {
            _id: itemId,
            tetel_id: itemId,
            tetel_etk: orig?.Etk || '',
            tetel_tarolohely: orig?.Tarolo || '',
            naplo: [{
              naplo_allapot: info.allapot,
              naplo_mennyiseg: info.mennyiseg,
              naplo_megjegyzes: info.megjegyzes || '',
              naplo_ido: time,
            }],
          };
          return reportItem(item, time);
        })
      );

      // A fulfilled promise only means the HTTP call didn't throw — the backend can still
      // respond 200 OK with `success: false` (e.g. a validation rejection), so that resolved
      // value must be checked too, otherwise a rejected item would wrongly be marked synced.
      const succeededIds: number[] = [];
      entries.forEach(([itemIdStr, info], idx) => {
        const result = results[idx];
        if (result.status === 'fulfilled' && result.value === true) {
          const itemId = parseInt(itemIdStr, 10);
          lastReportedRef.current = { ...lastReportedRef.current, [itemId]: info };
          succeededIds.push(itemId);
        }
      });

      if (succeededIds.length > 0) {
        await persistSyncedFlags(succeededIds, true);
      }
    },
    [reportItem, persistSyncedFlags]
  );

  const fetchTaskAndItems = useCallback(async () => {
    if (isNaN(taskId)) {
      setError('Érvénytelen feladat azonosító');
      setLoading(false);
      return;
    }

    try {
      if (!session.userName) return;

      setLoading(true);
      setError(null);

      // Fetch all tasks for user to find the matching task
      const allTasks = await getTasks(session.userName);
      const matched = allTasks.find((t) => t._id === taskId);

      if (!matched) {
        setError('A feladat nem található, vagy nincs hozzá jogosultsága.');
        setLoading(false);
        return;
      }

      setTask(matched);

      // Load persisted progress from local storage
      let unsyncedEntries: [string, { allapot: number; mennyiseg?: number; megjegyzes?: string }][] = [];
      try {
        const saved = await AsyncStorage.getItem(`task_progress_${taskId}`);
        const parsed = saved ? (JSON.parse(saved) as PersistedProgress) : {};
        persistedProgressRef.current = parsed;
        const withoutIdo: InitialProgress = Object.fromEntries(
          Object.entries(parsed).map(([itemIdStr, info]) => [itemIdStr, { allapot: info.allapot, mennyiseg: info.mennyiseg, megjegyzes: info.megjegyzes }])
        );
        setInitialProgress(withoutIdo);
        // Only items confirmed synced count as "already reported" — anything else (including
        // findings saved before a connectivity drop) must stay eligible for resend below.
        lastReportedRef.current = Object.fromEntries(
          Object.entries(withoutIdo).filter(([itemIdStr]) => parsed[Number(itemIdStr)]?.synced)
        );
        unsyncedEntries = Object.entries(withoutIdo).filter(([itemIdStr]) => !parsed[Number(itemIdStr)]?.synced);
        itemTimestampsRef.current = Object.fromEntries(
          Object.entries(parsed).filter(([, info]) => info.ido).map(([itemIdStr, info]) => [itemIdStr, info.ido as string])
        );
      } catch {
        setInitialProgress({});
        lastReportedRef.current = {};
        itemTimestampsRef.current = {};
        persistedProgressRef.current = {};
      }

      // Fetch task items
      const taskItems = await getTaskItems(taskId);
      setItems([...taskItems].sort((a, b) => a._id - b._id));

      // Retry any findings that were saved locally but never confirmed sent to the backend
      // (e.g. because the device was mid-handover between routers when the report failed).
      if (unsyncedEntries.length > 0) {
        reportEntries(unsyncedEntries, taskItems).catch(() => { });
      }
    } catch (err: any) {
      setError(err?.message || 'Hiba történt a feladat letöltése közben.');
    } finally {
      setLoading(false);
    }
  }, [taskId, session.userName, getTasks, getTaskItems, reportEntries]);

  useEffect(() => {
    fetchTaskAndItems();
  }, [fetchTaskAndItems]);

  // Re-fetch when screen regains focus (e.g., after returning from Chat)
  useEffect(() => {
    if (isFocused) {
      fetchTaskAndItems();
    }
  }, [isFocused, fetchTaskAndItems]);

  // Blink animation for unread messages (chat button)
  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (task?.hasUnread) {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(blinkAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        ]),
      );
      anim.start();
    } else {
      blinkAnim.setValue(1);
    }

    return () => {
      if (anim) { anim.stop(); }
      blinkAnim.setValue(1);
    };
  }, [task?.hasUnread, blinkAnim]);

  const handleSaveProgress = useCallback(
    async (
      updatedItems: Record<number, { allapot: number; mennyiseg?: number; megjegyzes?: string }>
    ) => {
      if (!task) return;

      // Only report items whose state actually changed since the last report — updatedItems
      // is the full merged progress, so re-sending everything would duplicate already-reported items
      const changedEntries = Object.entries(updatedItems).filter(([itemIdStr, info]) => {
        const prev = lastReportedRef.current[Number(itemIdStr)];
        return (
          !prev ||
          prev.allapot !== info.allapot ||
          prev.mennyiseg !== info.mennyiseg ||
          prev.megjegyzes !== info.megjegyzes
        );
      });
      const changedIds = new Set(changedEntries.map(([itemIdStr]) => Number(itemIdStr)));

      // Stamp changed items with the moment they were actually completed, so a later
      // auto-report can reuse it instead of overwriting it with the report time
      const now = getCurrentTimeString();
      for (const [itemIdStr] of changedEntries) {
        itemTimestampsRef.current[Number(itemIdStr)] = now;
      }

      // Persist locally first, including each item's completion timestamp. Changed items are
      // marked unsynced until the backend actually confirms them below, so a reload in between
      // (e.g. triggered by a network/router switch) can never mistake them for already reported.
      // Unchanged items keep whatever synced flag they already had.
      persistedProgressRef.current = Object.fromEntries(
        Object.entries(updatedItems).map(([itemIdStr, info]) => {
          const itemId = Number(itemIdStr);
          const synced = changedIds.has(itemId) ? false : (persistedProgressRef.current[itemId]?.synced ?? false);
          return [itemIdStr, { ...info, ido: itemTimestampsRef.current[itemId] ?? now, synced }];
        })
      );
      AsyncStorage.setItem(`task_progress_${taskId}`, JSON.stringify(persistedProgressRef.current)).catch(() => { });

      if (changedEntries.length === 0) return;

      await reportEntries(
        changedEntries as [string, { allapot: number; mennyiseg?: number; megjegyzes?: string }][],
        items
      );
    },
    [task, taskId, items, reportEntries]
  );

  if (loading && !task) {
    return (
      <View style={[styles.centerContainer, dynamicStyles.centerContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.infoText, dynamicStyles.infoText]}>Feladat elemeinek betöltése...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, dynamicStyles.centerContainer]}>
        <Text style={[styles.errorText, dynamicStyles.errorText]}>{error}</Text>
        <TouchableOpacity style={[styles.retryBtn, dynamicStyles.retryBtn]} onPress={fetchTaskAndItems}>
          <Text style={[styles.retryBtnTxt, dynamicStyles.retryBtnTxt]}>Újra</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={[styles.centerContainer, dynamicStyles.centerContainer]}>
        <Text style={[styles.errorText, dynamicStyles.errorText]}>A feladat nem áll rendelkezésre.</Text>
      </View>
    );
  }

  const handleOnCancel = () => {
    router.back();
  }

  const handleOnChat = () => {
    router.push(`/feladat/${task._id}/chat`)
  }

  const mapTaskType = (): React.ReactNode => {
    const typeInt = parseInt(task.fel_tipus || '0', 10);

    switch (typeInt) {
      case 0:
      case 1:
      case 4:
        return (
          <InventoryTask
            task={task}
            items={items}
            initialProgress={initialProgress}
            onSaveProgress={handleSaveProgress}
            registerExtraButtons={setExtraButtons}
          />
        );
      case 2:
      case 5:
        return (
          <MovementTask
            task={task}
            items={items}
            initialProgress={initialProgress}
            onSaveProgress={handleSaveProgress}
          />
        );
      case 3:
        return (
          <OtherTask
            task={task}
            items={items}
            initialProgress={initialProgress}
            onSaveProgress={handleSaveProgress}
          />
        );
      case 6:
      case 7:
        return (
          <PickingTask
            task={task}
            items={items}
            initialProgress={initialProgress}
            onSaveProgress={handleSaveProgress}
          />
        );
      case 9:
        return (
          <ReceivingTask
            task={task}
            items={items}
            initialProgress={initialProgress}
            onSaveProgress={handleSaveProgress}
          />
        );
      default:
        return (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>Ismeretlen feladattípus: {task.fel_tipus}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
              <Text style={styles.retryBtnTxt}>Vissza a feladatokhoz</Text>
            </TouchableOpacity>
          </View>
        );
    }
  }

  const taskComponent = mapTaskType();

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      {taskComponent}
      <View style={[styles.footerButtons, dynamicStyles.footerButtons]}>
        <TouchableOpacity style={[styles.btn, styles.cancelBtn, dynamicStyles.cancelBtn]} onPress={handleOnCancel}>
          <Text style={styles.cancelBtnText}>Vissza</Text>
        </TouchableOpacity>

        {
          extraButtons.map((btn, idx) => (
            <TouchableOpacity key={idx} style={[styles.btn, styles.chatBtn, dynamicStyles.chatBtn]} onPress={btn.handler}>
              <Text style={styles.chatBtnText}>{btn.text}</Text>
            </TouchableOpacity>
          ))
        }

        <Animated.View style={{ opacity: blinkAnim, flex: 1 }}>
          <TouchableOpacity style={[styles.btn, styles.chatBtn, dynamicStyles.chatBtn]} onPress={handleOnChat}>
            <Text style={styles.chatBtnText}>Csevegés 💬</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  )
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    padding: 24,
    gap: 12,
  },
  infoText: {
    color: '#334155',
    fontSize: 15,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#0369A1',
    borderRadius: 6,
  },
  retryBtnTxt: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  cancelBtn: {
    backgroundColor: '#64748B',
  },
  cancelBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  chatBtn: {
    backgroundColor: '#0284C7',
  },
  chatBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  footerButtons: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
});
