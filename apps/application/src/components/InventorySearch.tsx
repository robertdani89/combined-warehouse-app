import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Keyboard,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

type Talalat = {
    raktarnev: string;
    etk: string;
    cikkleiro: string;
    mero: string;
    tarolo: string;
};

type Props = {
    feladatID?: number;
    initialEan?: string;
    onSelect: (item: { etk: string; nev: string; mero: string; tarolo?: string }) => void;
};

import { useApi } from '../context/api';
import { useAppTheme } from '../theme/theme';

export default function InventorySearch({
    feladatID,
    initialEan,
    onSelect,
}: Props) {
    const { searchInventory } = useApi();
    const { colors } = useAppTheme();
    const [query, setQuery] = useState(initialEan ?? '');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<Talalat[]>([]);

    useEffect(() => {
        if (initialEan && initialEan.length > 0) {
            void search(initialEan);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialEan]);

    async function search(text?: string) {
        const leiras = (text ?? query).trim();
        if (leiras.length < 3) {
            Alert.alert('Figyelem', 'Minimum 3 karakter szükséges a kereséshez.');
            return;
        }

        setLoading(true);
        setResults([]);
        Keyboard.dismiss();

        try {
            const talalatok = await searchInventory(leiras, feladatID);

            if (Array.isArray(talalatok)) {
                const tal: Talalat[] = talalatok.map((t: any) => ({
                    raktarnev: t.RAKTARNEV1 ?? t.RAKTARNEV1,
                    etk: t.ETK ?? t.ETK,
                    cikkleiro: t.CIKKLEIRO1 ?? t.CIKKLEIRO1,
                    mero: t.MEROV1 ?? t.MEROV1,
                    tarolo: t.TAROL_AZON ?? t.TAROL_AZON,
                }));
                setResults(tal);
                if (tal.length === 0) {
                    Alert.alert('Nincs találat');
                }
            } else {
                Alert.alert('Hiba', 'Nem érkezett találat a szervertől.');
            }
        } catch (e) {
            Alert.alert('Hiba', 'Hálózati vagy szerverhiba történt.');
        } finally {
            setLoading(false);
        }
    }

    function renderItem({ item }: { item: Talalat }) {
        return (
            <Pressable
                style={styles.item}
                onPress={() => onSelect({ etk: item.etk, nev: item.cikkleiro, mero: item.mero, tarolo: item.tarolo })}
            >
                <Text style={styles.etk}>{item.etk}</Text>
                <Text style={styles.cikk}>{item.cikkleiro}</Text>
            </Pressable>
        );
    }

    const dynamicStyles = StyleSheet.create({
        container: { backgroundColor: colors.background },
        input: { borderColor: colors.border, backgroundColor: colors.inputBg, color: colors.textMain },
        button: { backgroundColor: colors.backgroundAlt, borderColor: colors.border },
        buttonText: { color: colors.textMain },
        etk: { color: colors.textMain },
        cikk: { color: colors.textSecondary },
        item: { borderBottomColor: colors.border },
    });

    return (
        <View style={[styles.container, dynamicStyles.container]}>
            <View style={styles.row}>
                <TextInput
                    style={[styles.input, dynamicStyles.input]}
                    placeholder="Keresés (min. 3 karakter)"
                    placeholderTextColor={colors.textSecondary}
                    value={query}
                    onChangeText={setQuery}
                    onSubmitEditing={() => void search()}
                    returnKeyType="search"
                />
                <Pressable style={[styles.button, dynamicStyles.button]} onPress={() => void search()}>
                    <Text style={[styles.buttonText, dynamicStyles.buttonText]}>Keres</Text>
                </Pressable>
            </View>

            {loading ? <ActivityIndicator style={{ marginTop: 12 }} color={colors.primary} /> : null}

            <FlatList
                style={styles.list}
                data={results}
                keyExtractor={(i) => i.etk + i.tarolo}
                renderItem={renderItem}
                keyboardShouldPersistTaps="handled"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    input: {
        height: 48,
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    button: {
        height: 48,
        backgroundColor: '#E5E7EB',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 4,
    },
    buttonText: { fontWeight: '500' },
    list: { marginTop: 12 },
    item: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
    etk: { fontWeight: '600' },
    cikk: { color: '#334155', marginTop: 2 },
});
