import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigate } from 'react-router';
import { useApi } from '../context/api';
import { LoginSession } from '../types/auth';
import { TaskRecord } from '../types/task';
import TaskListItem from './TaskListItem';

type FinishedTasksScreenProps = {
  session: LoginSession;
};

export default function FinishedTasksScreen({ session }: FinishedTasksScreenProps) {
  const { getTasks } = useApi();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const taskList = await getTasks(session.userName ?? session.name);
      setTasks(taskList.filter((t) => (t.allapot ?? 0) >= 5));
    } catch {
      setLoadError('Nem sikerült betölteni a feladatokat.');
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [getTasks, session.name, session.userName]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Lezárt feladatok</Text>
        <View style={styles.headerButtons}>
          <Pressable style={styles.secondaryButton} onPress={loadTasks}>
            <Text style={styles.secondaryButtonText}>Frissítés</Text>
          </Pressable>
          <Pressable style={styles.backButton} onPress={() => navigate('/feladatok')}>
            <Text style={styles.backButtonText}>Vissza</Text>
          </Pressable>
        </View>
      </View>

      {isLoading ? <Text style={styles.body}>Feladatok betöltése...</Text> : null}
      {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

      {!isLoading && !loadError && tasks.length === 0 ? (
        <Text style={styles.body}>Nincs lezárt feladat.</Text>
      ) : null}

      {!isLoading && !loadError && tasks.length > 0 ? (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {tasks.map((task) => (
            <View key={task._id} style={styles.disabledItem}>
              <TaskListItem task={task} />
            </View>
          ))}
        </ScrollView>
      ) : null}
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
  title: {
    flex: 1,
    color: '#111827',
    fontSize: 24,
    fontWeight: '600',
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
  disabledItem: {
    opacity: 0.7,
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
  backButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  backButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '500',
  },
});
