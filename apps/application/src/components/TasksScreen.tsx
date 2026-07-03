import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApi } from '../context/api';
import { LoginSession } from '../types/auth';
import { TaskRecord, TaskItem, ReportItem, ReportTask } from '../types/task';
import TaskListItem from './TaskListItem';
import LeaveTimePickerModal from './LeaveTimePickerModal';
import { useAppTheme } from '../theme/theme';
import { useIsFocused } from '@react-navigation/native';

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
  const { getTasks, getTaskItems, reportTasks, hasVegezIdo, getFreeTasks, requestTasks } = useApi();
  const router = useRouter();

  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showLeaveTimePicker, setShowLeaveTimePicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showFreeTasksModal, setShowFreeTasksModal] = useState(false);
  const [freeTasks, setFreeTasks] = useState<TaskRecord[]>([]);
  const [selectedFreeTaskIds, setSelectedFreeTaskIds] = useState<number[]>([]);
  const [loadingFreeTasks, setLoadingFreeTasks] = useState(false);

  const isFocused = useIsFocused();

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
          return allapot > 0;
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

  // Re-fetch when screen regains focus
  useEffect(() => {
    const fetchData = async () => {
      if (isFocused) {
        setIsLoading(true);
        await checkAndAutoReportTasks();
        await loadTasks();
      }
    };

    fetchData();
  }, [isFocused, checkAndAutoReportTasks, loadTasks]);

  const handleLogout = useCallback(() => {
    setShowMenu(false);
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

  const handlePickFreeTasks = useCallback(async () => {
    setLoadingFreeTasks(true);
    setSelectedFreeTaskIds([]);
    setFreeTasks([]);
    setShowFreeTasksModal(true);
    try {
      const list = await getFreeTasks();
      setFreeTasks(list);
    } catch {
      setFreeTasks([]);
    } finally {
      setLoadingFreeTasks(false);
    }
  }, [getFreeTasks]);

  const toggleFreeTaskSelection = useCallback((id: number) => {
    setSelectedFreeTaskIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const handleRequestTasks = useCallback(async () => {
    if (selectedFreeTaskIds.length === 0) return;
    try {
      await requestTasks(session.userName ?? session.name, selectedFreeTaskIds);
      setShowFreeTasksModal(false);
      await loadTasks();
    } catch {
      Alert.alert('Hiba', 'Nem sikerült felvenni a feladatokat.');
    }
  }, [selectedFreeTaskIds, requestTasks, session.userName, session.name, loadTasks]);

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
    menuCard: {
      backgroundColor: colors.cardBackground,
      borderColor: colors.border,
    },
    menuItemText: {
      color: colors.textMain,
    },
    modalOverlay: {
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    freeTaskCard: {
      backgroundColor: colors.cardBackground,
      borderColor: colors.border,
    },
    freeTaskTitle: {
      color: colors.textMain,
    },
    freeTaskSubtitle: {
      color: colors.textSecondary,
    },
    freeTaskSelected: {
      borderColor: colors.textMain,
    },
    modalTitle: {
      color: colors.textMain,
    },
  });

  return (
    <View style={[styles.screen, dynamicStyles.screen]}>
      <View style={styles.headerRow}>
        <Text style={[styles.greeting, dynamicStyles.greeting]}>Szia, {session.name}!</Text>
        <View style={styles.headerButtons}>
          {/* Refresh icon */}
          <Pressable style={[styles.iconButton, dynamicStyles.secondaryButton]} onPress={loadTasks}>
            <Text style={[styles.iconButtonText, dynamicStyles.secondaryButtonText]}>↻</Text>
          </Pressable>
          {/* Pick free task */}
          <Pressable style={[styles.iconButton, dynamicStyles.secondaryButton]} onPress={handlePickFreeTasks}>
            <Text style={[styles.iconButtonText, dynamicStyles.secondaryButtonText]}>+</Text>
          </Pressable>
          {/* More menu */}
          <Pressable style={[styles.iconButton, dynamicStyles.secondaryButton]} onPress={() => setShowMenu(true)}>
            <Text style={[styles.iconButtonText, dynamicStyles.secondaryButtonText]}>⋯</Text>
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

      {/* ⋯ dropdown menu */}
      <Modal
        transparent
        visible={showMenu}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable style={[styles.menuOverlay, dynamicStyles.modalOverlay]} onPress={() => setShowMenu(false)}>
          <View style={[styles.menuCard, dynamicStyles.menuCard]}>
            <Pressable
              style={styles.menuItem}
              onPress={() => { setShowMenu(false); router.push('/lezart-feladatok'); }}
            >
              <Text style={[styles.menuItemText, dynamicStyles.menuItemText]}>
                Lezárt{finishedCount > 0 ? ` (${finishedCount})` : ''}
              </Text>
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable style={styles.menuItem} onPress={handleLogout}>
              <Text style={[styles.menuItemText, dynamicStyles.menuItemText]}>Kilépés</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Free tasks picker modal */}
      <Modal
        transparent
        visible={showFreeTasksModal}
        animationType="slide"
        onRequestClose={() => setShowFreeTasksModal(false)}
      >
        <Pressable style={[styles.freeTasksOverlay, dynamicStyles.modalOverlay]} onPress={() => setShowFreeTasksModal(false)}>
          <View style={[styles.freeTasksSheet, dynamicStyles.menuCard]}>
            <Text style={[styles.freeTasksTitle, dynamicStyles.modalTitle]}>Szabad feladatok</Text>
            {loadingFreeTasks ? (
              <Text style={[styles.body, dynamicStyles.body]}>Betöltés...</Text>
            ) : freeTasks.length === 0 ? (
              <Text style={[styles.body, dynamicStyles.body]}>Nincs szabad feladat.</Text>
            ) : (
              <ScrollView style={styles.freeTasksList}>
                {freeTasks.map((task) => {
                  const selected = selectedFreeTaskIds.includes(task._id);
                  return (
                    <Pressable
                      key={task._id}
                      style={[styles.freeTaskItem, dynamicStyles.freeTaskCard, selected && dynamicStyles.freeTaskSelected]}
                      onPress={() => toggleFreeTaskSelection(task._id)}
                    >
                      <Text style={[styles.freeTaskName, dynamicStyles.freeTaskTitle]}>
                        {selected ? '☑ ' : '☐ '}{task.megnevezes ?? `#${task._id}`}
                      </Text>
                      {task.comment ? (
                        <Text style={[styles.freeTaskSub, dynamicStyles.freeTaskSubtitle]}>{task.comment}</Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
            <View style={styles.freeTasksActions}>
              <Pressable
                style={[styles.iconButton, dynamicStyles.secondaryButton]}
                onPress={() => setShowFreeTasksModal(false)}
              >
                <Text style={[styles.secondaryButtonText, dynamicStyles.secondaryButtonText]}>Mégse</Text>
              </Pressable>
              {selectedFreeTaskIds.length > 0 ? (
                <Pressable
                  style={[styles.iconButton, dynamicStyles.secondaryButton]}
                  onPress={handleRequestTasks}
                >
                  <Text style={[styles.secondaryButtonText, dynamicStyles.secondaryButtonText]}>
                    Felveszem ({selectedFreeTaskIds.length})
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingTop: 40,
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
  iconButton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 36,
    alignItems: 'center',
  },
  iconButtonText: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 22,
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
  // ⋯ dropdown menu
  menuOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 52,
    paddingRight: 8,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    minWidth: 160,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    color: '#111827',
    fontSize: 15,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  // Free tasks modal
  freeTasksOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  freeTasksSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 12,
    maxHeight: '75%',
  },
  freeTasksTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    color: '#111827',
  },
  freeTasksList: {
    flexGrow: 0,
    marginBottom: 10,
  },
  freeTaskItem: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  freeTaskName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  freeTaskSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  freeTasksActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
