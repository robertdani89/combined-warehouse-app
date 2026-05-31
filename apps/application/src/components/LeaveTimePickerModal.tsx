import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useApi } from '../context/api';
import { useAppTheme } from '../theme/theme';

type LeaveTimePickerModalProps = {
    visible: boolean;
    userName: string;
    onLogout: () => void;
    onSaved: () => void;
};

function formatDateTimeString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export default function LeaveTimePickerModal({ visible, userName, onLogout, onSaved }: LeaveTimePickerModalProps) {
    const { colors } = useAppTheme();
    const { saveVegzes } = useApi();

    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedHour, setSelectedHour] = useState(() => {
        const now = new Date();
        let h = now.getHours() + 1;
        const m = Math.ceil(now.getMinutes() / 5) * 5;
        if (m >= 60) h += 1;
        return h >= 24 ? 23 : h;
    });

    const [selectedMinute, setSelectedMinute] = useState(() => {
        const now = new Date();
        const m = Math.ceil(now.getMinutes() / 5) * 5;
        return m >= 60 ? 0 : m;
    });

    const incrementHour = useCallback(() => setSelectedHour((prev) => (prev + 1) % 24), []);
    const decrementHour = useCallback(() => setSelectedHour((prev) => (prev - 1 + 24) % 24), []);
    const incrementMinute = useCallback(() => setSelectedMinute((prev) => (prev + 5) % 60), []);
    const decrementMinute = useCallback(() => setSelectedMinute((prev) => (prev - 5 + 60) % 60), []);

    const handleSave = useCallback(async () => {
        setError(null);
        setIsSaving(true);

        try {
            const now = new Date();
            const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), selectedHour, selectedMinute, 0);

            if (targetDate.getTime() <= now.getTime()) {
                setError('A távozási időnek a jövőben kell lennie!');
                setIsSaving(false);
                return;
            }

            const formattedIdo = formatDateTimeString(targetDate);
            const success = await saveVegzes(userName, formattedIdo);
            if (success) {
                onSaved();
            } else {
                setError('Nem sikerült menteni a távozási időt a szerveren. Kérjük válassz egy jövőbeli időpontot!');
            }
        } catch {
            setError('Hálózati hiba történt a távozási idő mentése közben.');
        } finally {
            setIsSaving(false);
        }
    }, [selectedHour, selectedMinute, userName, saveVegzes, onSaved]);

    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={() => { }}>
            <View style={styles.overlay}>
                <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                    <Text style={[styles.title, { color: colors.textMain }]}>Távozási idő megadása</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Az alkalmazás használatának folytatásához kérjük add meg a mai tervezett távozási idődet!
                    </Text>

                    <View style={styles.timeSelectorContainer}>
                        <View style={styles.timeColumn}>
                            <Pressable
                                style={[styles.arrowButton, { backgroundColor: colors.backgroundAlt, borderColor: colors.border }]}
                                onPress={incrementHour}
                            >
                                <Text style={[styles.arrowButtonText, { color: colors.textMain }]}>▲</Text>
                            </Pressable>
                            <View style={[styles.timeBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <Text style={[styles.timeText, { color: colors.textMain }]}>{String(selectedHour).padStart(2, '0')}</Text>
                            </View>
                            <Pressable
                                style={[styles.arrowButton, { backgroundColor: colors.backgroundAlt, borderColor: colors.border }]}
                                onPress={decrementHour}
                            >
                                <Text style={[styles.arrowButtonText, { color: colors.textMain }]}>▼</Text>
                            </Pressable>
                            <Text style={[styles.timeLabel, { color: colors.textMuted }]}>Óra</Text>
                        </View>

                        <Text style={[styles.timeColon, { color: colors.textMain }]}>:</Text>

                        <View style={styles.timeColumn}>
                            <Pressable
                                style={[styles.arrowButton, { backgroundColor: colors.backgroundAlt, borderColor: colors.border }]}
                                onPress={incrementMinute}
                            >
                                <Text style={[styles.arrowButtonText, { color: colors.textMain }]}>▲</Text>
                            </Pressable>
                            <View style={[styles.timeBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <Text style={[styles.timeText, { color: colors.textMain }]}>{String(selectedMinute).padStart(2, '0')}</Text>
                            </View>
                            <Pressable
                                style={[styles.arrowButton, { backgroundColor: colors.backgroundAlt, borderColor: colors.border }]}
                                onPress={decrementMinute}
                            >
                                <Text style={[styles.arrowButtonText, { color: colors.textMain }]}>▼</Text>
                            </Pressable>
                            <Text style={[styles.timeLabel, { color: colors.textMuted }]}>Perc</Text>
                        </View>
                    </View>

                    {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}

                    <View style={styles.actions}>
                        <Pressable
                            style={[styles.cancelButton, { borderColor: colors.border }]}
                            disabled={isSaving}
                            onPress={onLogout}
                        >
                            <Text style={[styles.cancelButtonText, { color: colors.textMain }]}>Kilépés</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.saveButton, { backgroundColor: colors.primary }]}
                            disabled={isSaving}
                            onPress={handleSave}
                        >
                            {isSaving ? (
                                <ActivityIndicator size="small" color={colors.textOnPrimary} />
                            ) : (
                                <Text style={[styles.saveButtonText, { color: colors.textOnPrimary }]}>Mentés</Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        width: '100%',
        maxWidth: 320,
        borderRadius: 8,
        borderWidth: 1,
        padding: 20,
        gap: 16,
        shadowColor: '#000000',
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 5,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
    },
    timeSelectorContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 12,
    },
    timeColumn: {
        alignItems: 'center',
        gap: 4,
    },
    timeColon: {
        fontSize: 40,
        fontWeight: '700',
        marginHorizontal: 12,
        marginTop: -20,
    },
    arrowButton: {
        width: 44,
        height: 36,
        borderWidth: 1,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    arrowButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    timeBox: {
        width: 64,
        height: 54,
        borderWidth: 1,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    timeText: {
        fontSize: 28,
        fontWeight: '700',
    },
    timeLabel: {
        fontSize: 12,
        marginTop: 2,
        fontWeight: '500',
    },
    errorText: {
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: -4,
        marginBottom: 4,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginTop: 8,
    },
    cancelButton: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 6,
        paddingVertical: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    saveButton: {
        flex: 1,
        borderRadius: 6,
        paddingVertical: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
