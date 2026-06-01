import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { login, register } from '../../api/auth';
import { colors } from '../../theme/ui-reference';

interface Props {
  onAuthenticated: () => void;
}

type Tab = 'login' | 'register';

export function AuthScreen({ onAuthenticated }: Props) {
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function handleSubmit() {
    setError(undefined);
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, displayName.trim() || undefined);
      }
      onAuthenticated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kendala. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView
        style={s.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={s.inner}>
          {/* Logo */}
          <Text style={s.logo}>
            Tanya<Text style={s.logoAccent}>.</Text>
          </Text>

          <View style={s.spacer} />

          <Text style={s.h}>
            {tab === 'login' ? (
              <>
                Selamat{'\n'}
                <Text style={s.hAccent}>kembali.</Text>
              </>
            ) : (
              <>
                Buat{'\n'}
                <Text style={s.hAccent}>akun baru.</Text>
              </>
            )}
          </Text>

          {/* Tab toggle */}
          <View style={s.tabs}>
            <TouchableOpacity
              style={[s.tab, tab === 'login' && s.tabActive]}
              onPress={() => { setTab('login'); setError(undefined); }}
            >
              <Text style={[s.tabText, tab === 'login' && s.tabTextActive]}>Masuk</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.tab, tab === 'register' && s.tabActive]}
              onPress={() => { setTab('register'); setError(undefined); }}
            >
              <Text style={[s.tabText, tab === 'register' && s.tabTextActive]}>Daftar</Text>
            </TouchableOpacity>
          </View>

          {/* Fields */}
          {tab === 'register' && (
            <TextInput
              style={s.input}
              placeholder="Nama (opsional)"
              placeholderTextColor={colors.muted}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
          )}
          <TextInput
            style={s.input}
            placeholder="Email"
            placeholderTextColor={colors.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={s.input}
            placeholder="Kata sandi (min. 8 karakter)"
            placeholderTextColor={colors.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error ? <Text style={s.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={s.btnText}>
              {loading ? 'Memproses...' : tab === 'login' ? 'Masuk' : 'Buat akun'}
            </Text>
          </TouchableOpacity>

          <View style={s.spacer} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  kav: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: 30,
    paddingBottom: 20,
  },
  logo: {
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.5,
    color: colors.ink,
  },
  logoAccent: {
    color: colors.emerald,
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  h: {
    fontFamily: 'serif',
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '500',
    letterSpacing: -0.4,
    color: colors.ink,
    marginBottom: 24,
  },
  hAccent: {
    color: colors.emeraldDark,
  },

  // tabs
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.line,
    borderRadius: 12,
    padding: 3,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.white,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  tabTextActive: {
    color: colors.ink,
  },

  // inputs
  input: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 13,
    padding: 15,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 12,
  },

  error: {
    fontSize: 13,
    color: '#e53e3e',
    marginBottom: 12,
  },

  // button
  btn: {
    backgroundColor: colors.emerald,
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
