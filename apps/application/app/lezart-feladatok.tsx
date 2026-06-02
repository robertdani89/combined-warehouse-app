import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FinishedTasksScreen from '../src/components/FinishedTasksScreen';
import { useAuth } from '../src/context/auth';

export default function LezartFeladatokScreen() {
  const { session } = useAuth();

  if (!session) return null; // layout will redirect to /

  return (
    <SafeAreaView style={styles.safeArea}>
      <FinishedTasksScreen session={session} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
});
