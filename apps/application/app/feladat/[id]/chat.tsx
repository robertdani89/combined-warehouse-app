import ChatScreen from '../../../src/components/ChatScreen';
import { useAuth } from '../../../src/context/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';

export default function ChatRoute() {
    const { session } = useAuth();

    if (!session) return null; // layout will redirect to /

    return <SafeAreaView style={styles.safeArea}>
        return <ChatScreen session={session} />;
    </SafeAreaView>
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
});
