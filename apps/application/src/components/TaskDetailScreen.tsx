import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useParams, useNavigate } from 'react-router';
import { useApi } from '../context/api';
import { TaskRecord, TaskItem, ReportTask, ReportItem } from '../types/task';
import { LoginSession } from '../types/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

import InventoryTask from './task-types/InventoryTask';
import MovementTask from './task-types/MovementTask';
import OtherTask from './task-types/OtherTask';
import ReceivingTask from './task-types/ReceivingTask';
import PickingTask from './task-types/PickingTask';

interface TaskDetailScreenProps {
  session: LoginSession;
}

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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getTasks, getTaskItems, reportTasks, reportItem } = useApi();

  const [task, setTask] = useState<TaskRecord | null>(null);
  const [items, setItems] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialProgress, setInitialProgress] = useState<Record<number, { allapot: number; mennyiseg?: number; megjegyzes?: string }>>({});

  const taskId = useMemo(() => (id ? parseInt(id, 10) : NaN), [id]);

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

  const handleReport = useCallback(
    async (
      updatedItems: Record<number, { allapot: number; mennyiseg?: number; megjegyzes?: string }>,
      allapotCode: number
    ) => {
      if (!task) {return;}

      try {
        setLoading(true);

        const buildEntries = Object.entries(updatedItems);
        if (buildEntries.length === 0) {
          Alert.alert('Értesítés', 'Nincs mit lejelenteni, minden elem változatlan.');
          setLoading(false);
          return;
        }

        const reportItems: ReportItem[] = buildEntries.map(([itemIdStr, info]) => {
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
          id: task._id,
          allapot: allapotCode,
          elkezdte: task.elkezdte || getCurrentTimeString(),
          befejezte: allapotCode === 4 ? getCurrentTimeString() : task.befejezte,
          items: reportItems,
        };

        const success = await reportTasks([reportPayload]);
        if (success) {
          Alert.alert(
            'Sikeres művelet',
            allapotCode === 4 ? 'A feladat lejelentése sikeresen megtörtént!' : 'A részeredmények sikeresen elmentve.'
          );
          if (allapotCode === 4) {
            AsyncStorage.removeItem(`task_progress_${taskId}`).catch(() => {});
            navigate('/feladatok');
          } else {
            // Refresh local view
            await fetchTaskAndItems();
          }
        } else {
          Alert.alert('Hiba', 'A lejelentés nem sikerült a szerveren.');
        }
      } catch (err: any) {
        Alert.alert('Hiba', err?.message || 'Hiba lépett fel a lejelentés során.');
      } finally {
        setLoading(false);
      }
    },
    [task, items, reportTasks, navigate, fetchTaskAndItems]
  );

  const handleSaveProgress = useCallback(
    async (
      updatedItems: Record<number, { allapot: number; mennyiseg?: number; megjegyzes?: string }>
    ) => {
      if (!task) return;
      // Persist locally
      AsyncStorage.setItem(`task_progress_${taskId}`, JSON.stringify(updatedItems)).catch(() => {});
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

  const handleFinishTask = useCallback(
    async (
      updatedItems: Record<number, { allapot: number; mennyiseg?: number; megjegyzes?: string }>
    ) => {
      // Complete task (state: finished = 4)
      await handleReport(updatedItems, 4);
    },
    [handleReport]
  );

  if (loading && !task) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0369A1" />
        <Text style={styles.infoText}>Feladat elemeinek betöltése...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchTaskAndItems}>
          <Text style={styles.retryBtnTxt}>Újra</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>A feladat nem áll rendelkezésre.</Text>
      </View>
    );
  }

  const typeInt = parseInt(task.fel_tipus || '0', 10);

  // Map to the correct task UI layout component
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
          onFinishTask={handleFinishTask}
          onCancel={() => navigate('/feladatok')}
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
          onFinishTask={handleFinishTask}
          onCancel={() => navigate('/feladatok')}
        />
      );
    case 3:
      return (
        <OtherTask
          task={task}
          items={items}
          initialProgress={initialProgress}
          onSaveProgress={handleSaveProgress}
          onFinishTask={handleFinishTask}
          onCancel={() => navigate('/feladatok')}
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
          onFinishTask={handleFinishTask}
          onCancel={() => navigate('/feladatok')}
        />
      );
    case 9:
      return (
        <ReceivingTask
          task={task}
          items={items}
          initialProgress={initialProgress}
          onSaveProgress={handleSaveProgress}
          onFinishTask={handleFinishTask}
          onCancel={() => navigate('/feladatok')}
        />
      );
    default:
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Ismeretlen feladattípus: {task.fel_tipus}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => navigate('/feladatok')}>
            <Text style={styles.retryBtnTxt}>Vissza a feladatokhoz</Text>
          </TouchableOpacity>
        </View>
      );
  }
}

const styles = StyleSheet.create({
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
});
