import ChatScreen from '../../../src/components/ChatScreen';
import { useAuth } from '../../../src/context/auth';

export default function ChatRoute() {
    const { session } = useAuth();

    if (!session) return null; // layout will redirect to /

    return <ChatScreen session={session} />;
}
