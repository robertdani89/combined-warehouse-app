import { useCallback, useState } from 'react';
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
import { useNavigate } from 'react-router';
import { useApi } from '../context/api';
import { LoginSession } from '../types/auth';

type LoginScreenProps = {
  onLoginSuccess: (session: LoginSession) => Promise<void>;
  onResetAllData: () => Promise<void>;
};

export default function LoginScreen({ onLoginSuccess, onResetAllData }: LoginScreenProps) {
  const { login } = useApi();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

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
      setPassword('');
      setPasswordTouched(false);
      navigate('/feladatok', { replace: true });
    } catch {
      setLoginError('Sikertelen bejelentkezés. Ellenőrizd a felhasználónevet és jelszót.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    login,
    navigate,
    onLoginSuccess,
    onResetAllData,
    trimmedPass,
    trimmedUser,
  ]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.hero}>
        <Text style={styles.title}>Villumen</Text>
        <Text style={styles.subtitle}>Jelentkezz be a napi feladatokhoz</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Felhasználónév</Text>
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
          placeholderTextColor="#64748B"
          style={[styles.input, usernameTouched && isUsernameMissing ? styles.inputError : undefined]}
          value={username}
        />
        {usernameTouched && isUsernameMissing ? (
          <Text style={styles.errorText}>Felhasználónév megadása kötelező.</Text>
        ) : null}

        <Text style={styles.label}>Jelszó</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isSubmitting}
          onBlur={() => setPasswordTouched(true)}
          onChangeText={(value) => {
            setPassword(value);
            setLoginError(null);
          }}
          placeholder="Jelszó"
          placeholderTextColor="#64748B"
          secureTextEntry
          style={[styles.input, passwordTouched && isPasswordMissing ? styles.inputError : undefined]}
          value={password}
        />
        {passwordTouched && isPasswordMissing ? (
          <Text style={styles.errorText}>Jelszó megadása kötelező.</Text>
        ) : null}

        {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}

        <Pressable
          disabled={isLoginDisabled}
          onPress={handleLogin}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && !isLoginDisabled ? styles.primaryButtonPressed : undefined,
            isLoginDisabled ? styles.buttonDisabled : undefined,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#F8FAFC" />
          ) : (
            <Text style={styles.primaryButtonText}>Bejelentkezés</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
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
});
