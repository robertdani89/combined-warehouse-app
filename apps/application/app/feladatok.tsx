import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TasksScreen from '../src/components/TasksScreen';
import { useAuth } from '../src/context/auth';

export default function FeladatokScreen() {
  const { session, handleLogout } = useAuth();

  if (!session) return null; // layout will redirect to /

  return (
    <SafeAreaView style={styles.safeArea}>
      <TasksScreen onLogout={handleLogout} session={session} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
});
