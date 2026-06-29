import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useColorScheme,
    View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppErrorEntry } from '../types/errorLog';

const ERROR_LOG_KEY = '@villumen_error_log';
const MAX_STORED_ERRORS = 200;

type SyncFn = (errors: AppErrorEntry[]) => Promise<void>;

type ErrorLogContextValue = {
    logError: (message: string, context?: string) => void;
    errors: AppErrorEntry[];
    clearErrors: () => Promise<void>;
    registerSyncFn: (fn: SyncFn) => void;
};

const ErrorLogContext = createContext<ErrorLogContextValue | null>(null);

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function ErrorLogProvider({ children }: { children: React.ReactNode }) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [errors, setErrors] = useState<AppErrorEntry[]>([]);
    const [dialogError, setDialogError] = useState<AppErrorEntry | null>(null);
    const syncFnRef = useRef<SyncFn | null>(null);

    // Load persisted errors on mount
    useEffect(() => {
        AsyncStorage.getItem(ERROR_LOG_KEY)
            .then((raw) => {
                if (raw) {
                    const parsed = JSON.parse(raw) as AppErrorEntry[];
                    setErrors(parsed);
                }
            })
            .catch(() => { });
    }, []);

    const persistErrors = useCallback(async (list: AppErrorEntry[]) => {
        const trimmed = list.slice(-MAX_STORED_ERRORS);
        await AsyncStorage.setItem(ERROR_LOG_KEY, JSON.stringify(trimmed));
        return trimmed;
    }, []);

    const syncUnsynced = useCallback(
        async (list: AppErrorEntry[]) => {
            if (!syncFnRef.current) return list;
            const unsynced = list.filter((e) => !e.synced);
            if (unsynced.length === 0) return list;
            try {
                await syncFnRef.current(unsynced);
                return list.map((e) =>
                    e.synced ? e : { ...e, synced: true },
                );
            } catch {
                // Sync failed – keep errors marked as unsynced; will retry later
                return list;
            }
        },
        [],
    );

    const logError = useCallback(
        (message: string, context?: string) => {
            const entry: AppErrorEntry = {
                id: generateId(),
                timestamp: new Date().toISOString(),
                message,
                context,
                synced: false,
            };

            setErrors((prev) => {
                const next = [...prev, entry];
                persistErrors(next)
                    .then((trimmed) => syncUnsynced(trimmed))
                    .then((synced) => {
                        setErrors(synced);
                        persistErrors(synced).catch(() => { });
                    })
                    .catch(() => { });
                return next;
            });

            setDialogError(entry);
        },
        [persistErrors, syncUnsynced],
    );

    const clearErrors = useCallback(async () => {
        setErrors([]);
        await AsyncStorage.removeItem(ERROR_LOG_KEY);
    }, []);

    const registerSyncFn = useCallback((fn: SyncFn) => {
        syncFnRef.current = fn;
    }, []);

    // Periodically retry syncing unsynced errors (every 60 seconds)
    useEffect(() => {
        const interval = setInterval(() => {
            setErrors((prev) => {
                const hasUnsynced = prev.some((e) => !e.synced);
                if (!hasUnsynced) return prev;
                syncUnsynced(prev).then((synced) => {
                    setErrors(synced);
                    persistErrors(synced).catch(() => { });
                });
                return prev;
            });
        }, 60_000);
        return () => clearInterval(interval);
    }, [syncUnsynced, persistErrors]);

    const value = useMemo<ErrorLogContextValue>(
        () => ({ logError, errors, clearErrors, registerSyncFn }),
        [logError, errors, clearErrors, registerSyncFn],
    );

    return (
        <ErrorLogContext.Provider value={value}>
            {children}
            <ErrorDialog
                entry={dialogError}
                isDark={isDark}
                onClose={() => setDialogError(null)}
            />
        </ErrorLogContext.Provider>
    );
}

function ErrorDialog({
    entry,
    isDark,
    onClose,
}: {
    entry: AppErrorEntry | null;
    isDark: boolean;
    onClose: () => void;
}) {
    if (!entry) return null;

    const formattedTime = new Date(entry.timestamp).toLocaleString('hu-HU');

    return (
        <Modal
            visible
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.dialog, isDark && styles.dialogDark]}>
                    <Text style={[styles.title, isDark && styles.titleDark]}>Hiba történt</Text>
                    <Text style={[styles.time, isDark && styles.timeDark]}>{formattedTime}</Text>
                    {entry.context ? (
                        <Text style={[styles.context, isDark && styles.contextDark]}>
                            {entry.context}
                        </Text>
                    ) : null}
                    <ScrollView style={styles.messageScroll} showsVerticalScrollIndicator={false}>
                        <Text style={[styles.message, isDark && styles.messageDark]}>
                            {entry.message}
                        </Text>
                    </ScrollView>
                    <Pressable
                        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                        onPress={onClose}
                    >
                        <Text style={styles.buttonText}>OK</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    dialog: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
    },
    dialogDark: {
        backgroundColor: '#1E293B',
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        color: '#B91C1C',
        marginBottom: 4,
    },
    titleDark: {
        color: '#FCA5A5',
    },
    time: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 10,
    },
    timeDark: {
        color: '#94A3B8',
    },
    context: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
    },
    contextDark: {
        color: '#CBD5E1',
    },
    messageScroll: {
        maxHeight: 160,
        marginBottom: 16,
    },
    message: {
        fontSize: 14,
        color: '#111827',
        lineHeight: 20,
    },
    messageDark: {
        color: '#E2E8F0',
    },
    button: {
        backgroundColor: '#064E3B',
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: 'center',
    },
    buttonPressed: {
        opacity: 0.75,
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
    },
});

export function useErrorLog(): ErrorLogContextValue {
    const ctx = useContext(ErrorLogContext);
    if (!ctx) {
        throw new Error('useErrorLog must be used inside ErrorLogProvider.');
    }
    return ctx;
}
