import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useParams, useNavigate } from 'react-router';
import { useApi } from '../context/api';
import { TaskMessage } from '../types/task';
import { LoginSession } from '../types/auth';
import { useAppTheme } from '../theme/theme';

interface ChatScreenProps {
  session: LoginSession;
}

export default function ChatScreen({ session }: ChatScreenProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getUzenetek, postUzenet } = useApi();
  const { colors } = useAppTheme();

  const taskId = id ? parseInt(id, 10) : NaN;

  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);

  const loadMessages = useCallback(async () => {
    if (isNaN(taskId)) {
      setError('Érvénytelen feladat azonosító');
      setLoading(false);
      return;
    }

    try {
      const uzenetek = await getUzenetek(taskId, session.userName ?? session.name);
      setMessages(uzenetek);
      setError(null);
    } catch {
      setError('Nem sikerült betölteni az üzeneteket.');
    } finally {
      setLoading(false);
    }
  }, [taskId, session.userName, session.name, getUzenetek]);

  // Periodic polling for new messages - mimics DialogUzenet active loader behavior
  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 4000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  const handleSend = async () => {
    if (!inputText.trim() || isNaN(taskId) || sending) {
      return;
    }

    const messageToSend = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const success = await postUzenet(taskId, session.userName ?? session.name, messageToSend);
      if (success) {
        await loadMessages();
        // Scroll to end after sending
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        setError('Hiba történt az üzenet küldése közben.');
      }
    } catch {
      setError('Hiba történt az üzenet küldése közben.');
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: TaskMessage }) => {
    const isMe = item.felado === (session.userName ?? session.name);

    return (
      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
        <View style={[
          styles.messageBubble,
          isMe
            ? [styles.myBubble, { backgroundColor: colors.accent }]
            : [styles.otherBubble, { backgroundColor: colors.cardBackground, borderColor: colors.border }],
        ]}>
          <Text style={[styles.messageText, isMe ? styles.myMessageText : { color: colors.textMain }]}>
            {item.uzenet}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.senderText, { color: isMe ? 'rgba(255,255,255,0.6)' : colors.textSecondary }]}>{item.felado}</Text>
            <Text style={[styles.timeText, { color: isMe ? 'rgba(255,255,255,0.6)' : colors.textSecondary }]}>{item.kelt}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading && messages.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.infoText, { color: colors.textMuted }]}>Üzenetek betöltése...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.secondary }]} onPress={() => navigate(`/feladat/${taskId}`)}>
          <Text style={styles.backButtonText}>← Vissza</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textMain }]}>Üzenetek #{taskId}</Text>
        <TouchableOpacity style={[styles.refreshBtn, { backgroundColor: colors.backgroundAlt, borderColor: colors.border }]} onPress={loadMessages}>
          <Text style={[styles.refreshBtnText, { color: colors.textMain }]}>Frissítés</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: colors.dangerBg, borderBottomColor: colors.danger }]}>
          <Text style={[styles.errorText, { color: colors.dangerDark }]}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Input row */}
      <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
        <TextInput
          style={[styles.textInput, { borderColor: colors.border, backgroundColor: colors.inputBg, color: colors.textMain }]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Írjon üzenetet..."
          placeholderTextColor={colors.textSecondary}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: colors.accent }, !inputText.trim() && { opacity: 0.5 }]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.sendButtonText}>Küldés</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  infoText: {
    marginTop: 12,
    fontSize: 15,
    color: '#475569',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#64748B',
    borderRadius: 4,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  refreshBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  refreshBtnText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FCA5A5',
    alignItems: 'center',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
  },
  listContent: {
    padding: 12,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 10,
    width: '100%',
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  myBubble: {
    backgroundColor: '#0284C7',
    borderBottomRightRadius: 2,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#0F172A',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    justifyContent: 'flex-end',
    gap: 8,
  },
  senderText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  timeText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 40,
    fontSize: 14,
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#0284C7',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});