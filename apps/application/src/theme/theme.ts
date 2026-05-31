import { useColorScheme, StyleSheet, ViewStyle, TextStyle } from 'react-native';

export const palette = {
    light: {
        primary: '#0F766E', // Teal
        secondary: '#64748B', // Slate
        accent: '#0284C7', // Sky blue for chat
        danger: '#EF4444', // Red
        dangerDark: '#B91C1C',
        dangerBg: '#FEE2E2',
        success: '#10B981', // Green
        successDark: '#047857',
        successBg: '#DCFCE7',
        warning: '#F59E0B', // Amber
        warningBg: '#FEF3C7',
        background: '#FFFFFF',
        backgroundAlt: '#F8FAFC',
        cardBackground: '#FFFFFF',
        border: '#CBD5E1',
        borderAlt: '#E2E8F0',
        textMain: '#0F172A',
        textMuted: '#475569',
        textSecondary: '#64748B',
        textOnPrimary: '#FFFFFF',
        buttonDisabled: '#CBD5E1',
        inputBg: '#FFFFFF',
    },
    dark: {
        primary: '#14B8A6', // Bright Teal
        secondary: '#94A3B8', // Lighter Slate
        accent: '#38BDF8', // Lighter Sky blue
        danger: '#F87171', // Lighter Red
        dangerDark: '#EF4444',
        dangerBg: '#7F1D1D',
        success: '#34D399', // Lighter Green
        successDark: '#10B981',
        successBg: '#064E3B',
        warning: '#FBBF24', // Lighter Amber
        warningBg: '#78350F',
        background: '#0F172A', // Very dark blue/slate
        backgroundAlt: '#1E293B',
        cardBackground: '#1E293B',
        border: '#334155',
        borderAlt: '#475569',
        textMain: '#F8FAFC',
        textMuted: '#CBD5E1',
        textSecondary: '#94A3B8',
        textOnPrimary: '#0F172A',
        buttonDisabled: '#475569',
        inputBg: '#1E293B',
    },
};

export function useAppTheme() {
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const colors = isDark ? palette.dark : palette.light;

    const sharedStyles = StyleSheet.create({
        screen: {
            flex: 1,
            backgroundColor: colors.background,
            paddingHorizontal: 8,
            paddingTop: 8,
            paddingBottom: 4,
        } as ViewStyle,
        centerContainer: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.background,
        } as ViewStyle,
        infoText: {
            marginTop: 12,
            fontSize: 15,
            color: colors.textMuted,
        } as TextStyle,
        errorText: {
            color: colors.danger,
            fontSize: 14,
            lineHeight: 20,
            marginHorizontal: 4,
            marginBottom: 8,
        } as TextStyle,
        card: {
            backgroundColor: colors.cardBackground,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 12,
            shadowColor: colors.textMain,
            shadowOpacity: isDark ? 0.3 : 0.08,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
        } as ViewStyle,
        input: {
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.inputBg,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: colors.textMain,
            fontSize: 15,
        } as ViewStyle,
        button: {
            height: 48,
            borderRadius: 6,
            alignItems: 'center',
            justifyContent: 'center',
        } as ViewStyle,
        primaryButton: {
            backgroundColor: colors.primary,
        } as ViewStyle,
        cancelButton: {
            backgroundColor: colors.secondary,
        } as ViewStyle,
        chatButton: {
            backgroundColor: colors.accent,
        } as ViewStyle,
        buttonText: {
            color: isDark && colors.primary === '#14B8A6' && !isDark ? '#000000' : '#FFFFFF',
            fontWeight: 'bold',
            fontSize: 15,
        } as TextStyle,
    });

    return {
        isDark,
        colors,
        sharedStyles,
    };
}
