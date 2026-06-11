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
import { TaskRecord, TaskItem, ReportTask, ReportItem } from '../types/task';
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
  const { getTasks, getTaskItems, reportTasks, reportItem } = useApi();

  const isFocused = useIsFocused();

  const [task, setTask] = useState<TaskRecord | null>(null);
  const [items, setItems] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialProgress, setInitialProgress] = useState<InitialProgress>({});
  const [extraButtons, setExtraButtons] = useState<ExtraButton[]>([]);

  const taskId = useMemo(() => (id ? parseInt(id, 10) : NaN), [id]);

  const blinkAnim = useRef(new Animated.Value(1)).current;

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
      try {
        const saved = await AsyncStorage.getItem(`task_progress_${taskId}`);
        setInitialProgress(saved ? (JSON.parse(saved) as Record<number, { allapot: number; mennyiseg?: number; megjegyzes?: string }>) : {});
      } catch {
        setInitialProgress({});
      }

      // Fetch task items
      const taskItems = await getTaskItems(taskId);
      setItems([...taskItems].sort((a, b) => a._id - b._id));
    } catch (err: any) {
      setError(err?.message || 'Hiba történt a feladat letöltése közben.');
    } finally {
      setLoading(false);
    }
  }, [taskId, session.userName, getTasks, getTaskItems]);

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
      // Persist locally
      AsyncStorage.setItem(`task_progress_${taskId}`, JSON.stringify(updatedItems)).catch(() => { });
      // Silently report each changed item via PUT report-item — ignore all errors
      if (Object.keys(updatedItems).length === 0) return;
      try {
        const time = getCurrentTimeString();
        await Promise.all(
          Object.entries(updatedItems).map(([itemIdStr, info]) => {
            const itemId = parseInt(itemIdStr, 10);
            const orig = items.find((i) => i._id === itemId);
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
      } catch {
        // Silently ignore server errors for auto-save
      }
    },
    [task, taskId, items, reportItem]
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
