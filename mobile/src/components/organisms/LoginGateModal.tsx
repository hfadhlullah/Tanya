import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { login, register } from '../../api/auth';
import { colors } from '../../theme/ui-reference';

interface Props {
  visible: boolean;
  onSuccess: () => void;
  onDismiss: () => void;
}

type Tab = 'login' | 'register';

export function LoginGateModal({ visible, onSuccess, onDismiss }: Props) {
  const [tab, setTab] = useState<Tab>('register');
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
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kendala.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={s.backdrop}>
        <TouchableOpacity style={s.dismissArea} onPress={onDismiss} activeOpacity={1} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.sheet}>
            {/* Handle */}
            <View style={s.handle} />

            <Text style={s.eyebrow}>✓ Pertanyaanmu sudah diterima</Text>
            <Text style={s.h}>
              Simpan riwayat &{'\n'}
              <Text style={s.hAccent}>tanya lebih banyak.</Text>
            </Text>
            <Text style={s.sub}>
              Buat akun gratis untuk menyimpan jawabanmu & lanjut bertanya.
            </Text>

            {/* Tabs */}
            <View style={s.tabs}>
              {(['register', 'login'] as Tab[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[s.tab, tab === t && s.tabActive]}
                  onPress={() => { setTab(t); setError(undefined); }}
                >
                  <Text style={[s.tabText, tab === t && s.tabTextActive]}>
                    {t === 'register' ? 'Daftar' : 'Sudah punya akun'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

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
                {loading ? 'Memproses...' : tab === 'register' ? 'Buat akun' : 'Masuk'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.skipBtn} onPress={onDismiss}>
              <Text style={s.skipText}>Nanti saja</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(13,33,26,0.5)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    gap: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    alignSelf: 'center',
    marginBottom: 8,
  },
  eyebrow: {
    fontSize: 12,
    color: colors.emeraldDark,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  h: {
    fontFamily: 'serif',
    fontSize: 26,
    lineHeight: 33,
    fontWeight: '500',
    color: colors.ink,
    letterSpacing: -0.4,
  },
  hAccent: {
    color: colors.emeraldDark,
  },
  sub: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 21,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.line,
    borderRadius: 12,
    padding: 3,
    marginTop: 4,
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
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  tabTextActive: {
    color: colors.ink,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 13,
    padding: 14,
    fontSize: 15,
    color: colors.ink,
  },
  error: {
    fontSize: 13,
    color: '#e53e3e',
  },
  btn: {
    backgroundColor: colors.emerald,
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '500',
  },
});
