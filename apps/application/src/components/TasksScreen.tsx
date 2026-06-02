import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApi } from '../context/api';
import { LoginSession } from '../types/auth';
import { TaskRecord, TaskItem, ReportItem, ReportTask } from '../types/task';
import TaskListItem from './TaskListItem';
import LeaveTimePickerModal from './LeaveTimePickerModal';
import { useAppTheme } from '../theme/theme';

type TasksScreenProps = {
  session: LoginSession;
  onLogout: () => Promise<void>;
};

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

export default function TasksScreen({ session, onLogout }: TasksScreenProps) {
  const { colors } = useAppTheme();
  const { getTasks, getTaskItems, reportTasks, hasVegezIdo } = useApi();
  const router = useRouter();

  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showLeaveTimePicker, setShowLeaveTimePicker] = useState(false);

  const checkAndAutoReportTasks = useCallback(async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const progressKeys = keys.filter((key) => key.startsWith('task_progress_'));

      for (const key of progressKeys) {
        const taskIdStr = key.replace('task_progress_', '');
        const taskId = parseInt(taskIdStr, 10);
        if (isNaN(taskId)) continue;

        const progressStr = await AsyncStorage.getItem(key);
        if (!progressStr) continue;

        const progress = JSON.parse(progressStr) as Record<
          number,
          { allapot: number; mennyiseg?: number; megjegyzes?: string }
        >;

        let items: TaskItem[] = [];
        try {
          items = await getTaskItems(taskId);
        } catch {
          continue;
        }

        if (!items || items.length === 0) continue;

        const allDone = items.every((item) => {
          const override = progress[item._id];
          const allapot = override ? override.allapot : (item.allapot ?? 0);
          return allapot !== 0;
        });

        if (allDone) {
          const reportItems: ReportItem[] = Object.entries(progress).map(([itemIdStr, info]) => {
            const itemId = parseInt(itemIdStr, 10);
            const orig = items.find((i) => i._id === itemId);

            return {
              _id: itemId,
              tetel_id: itemId,
              tetel_etk: orig?.Etk || '',
              tetel_tarolohely: orig?.Tarolo || '',
              naplo: [
                {
                  naplo_allapot: info.allapot,
                  naplo_mennyiseg: info.mennyiseg,
                  naplo_megjegyzes: info.megjegyzes || '',
                  naplo_ido: getCurrentTimeString(),
                },
              ],
            };
          });

          const reportPayload: ReportTask = {
            id: taskId,
            allapot: 4,
            elkezdte: getCurrentTimeString(),
            befejezte: getCurrentTimeString(),
            items: reportItems,
          };

          const success = await reportTasks([reportPayload]);
          if (success) {
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch {
      // ignore silently
    }
  }, [getTaskItems, reportTasks]);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const hasTime = await hasVegezIdo(session.userName ?? session.name);
      if (!hasTime) {
        setShowLeaveTimePicker(true);
      }
      await checkAndAutoReportTasks();
      const taskList = await getTasks(session.userName ?? session.name);
      setTasks(taskList);
    } catch {
      setLoadError('Nem sikerült betölteni a feladatokat.');
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [getTasks, session.name, session.userName, checkAndAutoReportTasks, hasVegezIdo]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Kijelentkezés',
      'Biztosan ki szeretnél lépni?',
      [
        { text: 'Mégse', style: 'cancel' },
        {
          text: 'Igen',
          onPress: async () => {
            setShowLeaveTimePicker(false);
            await onLogout();
            router.replace('/');
          },
        },
      ],
      { cancelable: true }
    );
  }, [onLogout]);

  useEffect(() => {
    let isActive = true;

    void (async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const hasTime = await hasVegezIdo(session.userName ?? session.name);
        if (isActive) {
          if (!hasTime) {
            setShowLeaveTimePicker(true);
          }
        }

        await checkAndAutoReportTasks();
        const taskList = await getTasks(session.userName ?? session.name);
        if (!isActive) {
          return;
        }

        setTasks(taskList);
      } catch {
        if (!isActive) {
          return;
        }

        setLoadError('Nem sikerült betölteni a feladatokat.');
        setTasks([]);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [getTasks, checkAndAutoReportTasks, session.name, session.userName, hasVegezIdo]);

  const activeTasks = tasks.filter((t) => (t.allapot ?? 0) < 5);
  const finishedCount = tasks.filter((t) => (t.allapot ?? 0) >= 5).length;

  const dynamicStyles = StyleSheet.create({
    screen: {
      backgroundColor: colors.background,
    },
    greeting: {
      color: colors.textMain,
    },
    body: {
      color: colors.textSecondary,
    },
    errorText: {
      color: colors.danger,
    },
    secondaryButton: {
      backgroundColor: colors.backgroundAlt,
      borderColor: colors.border,
    },
    secondaryButtonText: {
      color: colors.textMain,
    },
    logoutButton: {
      backgroundColor: colors.cardBackground,
      borderColor: colors.border,
    },
    logoutButtonText: {
      color: colors.textMain,
    },
  });

  return (
    <View style={[styles.screen, dynamicStyles.screen]}>
      <View style={styles.headerRow}>
        <Text style={[styles.greeting, dynamicStyles.greeting]}>Szia, {session.name}!</Text>
        <View style={styles.headerButtons}>
          <Pressable style={[styles.secondaryButton, dynamicStyles.secondaryButton]} onPress={loadTasks}>
            <Text style={[styles.secondaryButtonText, dynamicStyles.secondaryButtonText]}>Frissítés</Text>
          </Pressable>
          <Pressable style={[styles.secondaryButton, dynamicStyles.secondaryButton]} onPress={() => router.push('/lezart-feladatok')}>
            <Text style={[styles.secondaryButtonText, dynamicStyles.secondaryButtonText]}>
              Lezárt{finishedCount > 0 ? ` (${finishedCount})` : ''}
            </Text>
          </Pressable>
          <Pressable style={[styles.logoutButton, dynamicStyles.logoutButton]} onPress={handleLogout}>
            <Text style={[styles.logoutButtonText, dynamicStyles.logoutButtonText]}>Kilépés</Text>
          </Pressable>
        </View>
      </View>

      {isLoading ? <Text style={[styles.body, dynamicStyles.body]}>Feladatok betöltése...</Text> : null}
      {loadError ? <Text style={[styles.errorText, dynamicStyles.errorText]}>{loadError}</Text> : null}

      {!isLoading && !loadError && activeTasks.length === 0 ? (
        <Text style={[styles.body, dynamicStyles.body]}>Nincs aktív feladat.</Text>
      ) : null}

      {!isLoading && !loadError && activeTasks.length > 0 ? (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {activeTasks.map((task) => (
            <Pressable key={task._id} onPress={() => router.push(`/feladat/${task._id}`)}>
              <TaskListItem task={task} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <LeaveTimePickerModal
        visible={showLeaveTimePicker}
        userName={session.userName ?? session.name}
        onLogout={handleLogout}
        onSaved={() => setShowLeaveTimePicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  greeting: {
    flex: 1,
    color: '#111827',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '500',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  body: {
    color: '#334155',
    fontSize: 15,
    lineHeight: 22,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    lineHeight: 20,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 8,
  },
  secondaryButton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  logoutButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '500',
  },
});
