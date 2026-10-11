import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApi } from '../context/api';
import { LoginSession } from '../types/auth';
import { useAppTheme } from '../theme/theme';

type LoginScreenProps = {
  onLoginSuccess: (session: LoginSession) => Promise<void>;
  onResetAllData: () => Promise<void>;
};

export default function LoginScreen({ onLoginSuccess, onResetAllData }: LoginScreenProps) {
  const { colors } = useAppTheme();
  const { login, saveFirebaseToken, isBackendReachable, isCheckingConnection, connectionError, checkConnection } = useApi();
  const router = useRouter();

  const passwordRef = useRef<TextInput>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    checkConnection().catch(() => { });
  }, [checkConnection]);

  const trimmedUser = username.trim();
  const trimmedPass = password.trim();
  const isUsernameMissing = trimmedUser.length === 0;
  const isPasswordMissing = trimmedPass.length === 0;
  const isLoginDisabled = isSubmitting || isUsernameMissing || isPasswordMissing;

  const handleLogin = useCallback(async () => {
    setLoginError(null);

    if (trimmedUser === 'torol' && trimmedPass === 'mindent') {
      setIsSubmitting(true);
      try {
        await onResetAllData();
        setUsername('');
        setPassword('');
        setUsernameTouched(false);
        setPasswordTouched(false);
        Alert.alert('Siker', 'Minden helyi adat torolve.');
      } catch {
        Alert.alert('Hiba', 'Az adatok torlese nem sikerult.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!trimmedUser || !trimmedPass) {
      setUsernameTouched(true);
      setPasswordTouched(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await login(trimmedUser, trimmedPass);
      await onLoginSuccess(session);

      // Register for push notifications and send token to backend if available
      try {
        const { getDevicePushToken } = await import('../utils/push');
        const token = await getDevicePushToken();

        if (token && session.userName) {
          await saveFirebaseToken(session.userName, token);
        } else {
          console.warn('Push token not available or session userName missing');
        }
      } catch (e) {
        console.error('Failed to register for push notifications', e);
      }

      setPassword('');
      setPasswordTouched(false);
      router.replace('/feladatok');
    } catch (error: any) {
      console.error('Login failed', error.message || error);
      console.error('Login failed', error.stack || 'no stack');
      const detail = error?.message ? ` (${error.message})` : '';
      setLoginError(`Sikertelen bejelentkezés. Ellenőrizd a felhasználónevet és jelszót.${detail}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    login,
    router,
    onLoginSuccess,
    onResetAllData,
    trimmedPass,
    trimmedUser,
  ]);

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: colors.background,
    },
    title: {
      color: colors.textMain,
    },
    subtitle: {
      color: colors.textMuted,
    },
    card: {
      backgroundColor: colors.cardBackground,
      borderColor: colors.border,
      shadowColor: colors.textMain,
    },
    label: {
      color: colors.textMain,
    },
    input: {
      borderColor: colors.border,
      backgroundColor: colors.background,
      color: colors.textMain,
    },
    inputError: {
      borderColor: colors.danger,
    },
    errorText: {
      color: colors.danger,
    },
    primaryButton: {
      backgroundColor: colors.primary,
    },
    buttonDisabled: {
      backgroundColor: colors.buttonDisabled,
    },
    primaryButtonText: {
      color: colors.textOnPrimary,
    },
    passwordInput: {
      flex: 1,
      borderWidth: 0,
      backgroundColor: 'transparent',
    },
    passwordWrapper: {
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    connectionText: {
      color: colors.textMuted,
    },
    retryButton: {
      backgroundColor: colors.primary,
    },
    retryButtonText: {
      color: colors.textOnPrimary,
    },
  });

  const showLoginForm = !isCheckingConnection && isBackendReachable;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, dynamicStyles.container]}
    >
      <View style={styles.hero}>
        <Text style={[styles.title, dynamicStyles.title]}>Villumen</Text>
        <Text style={[styles.subtitle, dynamicStyles.subtitle]}>Jelentkezz be</Text>
      </View>

      {isCheckingConnection ? (
        <View style={[styles.card, dynamicStyles.card, styles.connectionCard]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.connectionText, dynamicStyles.connectionText]}>
            Kapcsolódás a szerverhez...
          </Text>
        </View>
      ) : !isBackendReachable ? (
        <View style={[styles.card, dynamicStyles.card, styles.connectionCard]}>
          <Text style={[styles.errorText, dynamicStyles.errorText]}>
            Nem sikerült csatlakozni a szerverhez.
          </Text>
          {connectionError ? (
            <Text style={[styles.connectionText, dynamicStyles.connectionText]} selectable>
              {connectionError}
            </Text>
          ) : null}
          <Pressable
            onPress={() => checkConnection().catch(() => { })}
            style={({ pressed }) => [
              styles.retryButton,
              dynamicStyles.retryButton,
              pressed ? styles.primaryButtonPressed : undefined,
            ]}
          >
            <Text style={[styles.primaryButtonText, dynamicStyles.retryButtonText]}>Újrapróbálkozás</Text>
          </Pressable>
        </View>
      ) : null}

      {showLoginForm ? (
        <View style={[styles.card, dynamicStyles.card]}>
          <Text style={[styles.label, dynamicStyles.label]}>Felhasználónév</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSubmitting}
            onBlur={() => setUsernameTouched(true)}
            onChangeText={(value) => {
              setUsername(value);
              setLoginError(null);
            }}
            placeholder="Felhasználónév"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            blurOnSubmit={false}
            style={[
              styles.input,
              dynamicStyles.input,
              usernameTouched && isUsernameMissing ? dynamicStyles.inputError : undefined,
            ]}
            value={username}
          />
          {usernameTouched && isUsernameMissing ? (
            <Text style={[styles.errorText, dynamicStyles.errorText]}>Felhasználónév megadása kötelező.</Text>
          ) : null}

          <Text style={[styles.label, dynamicStyles.label]}>Jelszó</Text>
          <View
            style={[
              styles.passwordWrapper,
              dynamicStyles.passwordWrapper,
              passwordTouched && isPasswordMissing ? dynamicStyles.inputError : undefined,
            ]}
          >
            <TextInput
              ref={passwordRef}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
              onBlur={() => setPasswordTouched(true)}
              onChangeText={(value) => {
                setPassword(value);
                setLoginError(null);
              }}
              placeholder="Jelszó"
              placeholderTextColor={colors.textSecondary}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              secureTextEntry={!isPasswordVisible}
              style={[styles.input, dynamicStyles.input, styles.passwordInput]}
              value={password}
            />
            <Pressable
              accessibilityLabel={isPasswordVisible ? 'Jelszó elrejtése' : 'Jelszó megjelenítése'}
              hitSlop={8}
              onPress={() => setIsPasswordVisible((prev) => !prev)}
              style={styles.passwordToggle}
            >
              <Ionicons
                name={isPasswordVisible ? 'eye-off' : 'eye'}
                size={22}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>
          {passwordTouched && isPasswordMissing ? (
            <Text style={[styles.errorText, dynamicStyles.errorText]}>Jelszó megadása kötelező.</Text>
          ) : null}

          {loginError ? <Text style={[styles.errorText, dynamicStyles.errorText]}>{loginError}</Text> : null}

          <Pressable
            disabled={isLoginDisabled}
            onPress={handleLogin}
            style={({ pressed }) => [
              styles.primaryButton,
              dynamicStyles.primaryButton,
              pressed && !isLoginDisabled ? styles.primaryButtonPressed : undefined,
              isLoginDisabled ? dynamicStyles.buttonDisabled : undefined,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <Text style={[styles.primaryButtonText, dynamicStyles.primaryButtonText]}>Bejelentkezés</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 64,
    paddingHorizontal: 24,
    gap: 20,
  },
  hero: {
    gap: 6,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 15,
    color: '#334155',
  },
  card: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  label: {
    marginTop: 4,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0F172A',
    fontSize: 16,
  },
  inputError: {
    borderColor: '#DC2626',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    marginTop: -2,
  },
  primaryButton: {
    marginTop: 14,
    backgroundColor: '#0F766E',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#F8FAFC',
    fontWeight: '800',
    fontSize: 16,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  retryButton: {
    marginTop: 4,
    backgroundColor: '#0F766E',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 20,
  },
  connectionText: {
    fontSize: 13,
    color: '#334155',
    textAlign: 'left',
  },
  passwordToggle: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  connectionCard: {
    alignItems: 'center',
    gap: 8,
  },
});
