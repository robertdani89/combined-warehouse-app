import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigate } from 'react-router';
import { useApi } from '../context/api';
import { LoginSession } from '../types/auth';
import { TaskRecord } from '../types/task';
import TaskListItem from './TaskListItem';

type TasksScreenProps = {
  session: LoginSession;
  onLogout: () => Promise<void>;
};

export default function TasksScreen({ session, onLogout }: TasksScreenProps) {
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
      setTasks(taskList);
    } catch {
      setLoadError('Nem sikerült betölteni a feladatokat.');
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [getTasks, session.name, session.userName]);

  const handleLogout = async () => {
    await onLogout();
    navigate('/', { replace: true });
  };

  useEffect(() => {
    let isActive = true;

    void (async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
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
  }, [getTasks, loadTasks, session.name, session.userName]);

  const activeTasks = tasks.filter((t) => (t.allapot ?? 0) < 5);
  const finishedCount = tasks.filter((t) => (t.allapot ?? 0) >= 5).length;

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Text style={styles.greeting}>Szia, {session.name}!</Text>
        <View style={styles.headerButtons}>
          <Pressable style={styles.secondaryButton} onPress={loadTasks}>
            <Text style={styles.secondaryButtonText}>Frissítés</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => navigate('/lezart-feladatok')}>
            <Text style={styles.secondaryButtonText}>
              Lezárt{finishedCount > 0 ? ` (${finishedCount})` : ''}
            </Text>
          </Pressable>
          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Kilépés</Text>
          </Pressable>
        </View>
      </View>

      {isLoading ? <Text style={styles.body}>Feladatok betöltése...</Text> : null}
      {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

      {!isLoading && !loadError && activeTasks.length === 0 ? (
        <Text style={styles.body}>Nincs aktív feladat.</Text>
      ) : null}

      {!isLoading && !loadError && activeTasks.length > 0 ? (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {activeTasks.map((task) => (
            <Pressable key={task._id} onPress={() => navigate(`/feladat/${task._id}`)}>
              <TaskListItem task={task} />
            </Pressable>
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
