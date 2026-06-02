import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LoginScreen from '../src/components/LoginScreen';
import { useAuth } from '../src/context/auth';

export default function IndexScreen() {
  const { session, handleLoginSuccess, handleResetAllData } = useAuth();

  if (session) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <LoginScreen onLoginSuccess={handleLoginSuccess} onResetAllData={handleResetAllData} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
});
