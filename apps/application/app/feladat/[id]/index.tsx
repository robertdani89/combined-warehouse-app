import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TaskDetailScreen from '../../../src/components/TaskDetailScreen';
import { useAuth } from '../../../src/context/auth';

export default function TaskDetailRoute() {
  const { session } = useAuth();

  if (!session) return null; // layout will redirect to /

  return (
    <SafeAreaView style={styles.safeArea}>
      <TaskDetailScreen session={session} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
});
