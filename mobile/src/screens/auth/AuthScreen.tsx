import { useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { login, register } from '../../api/auth';
import { PrimaryButton } from '../../components/atoms/PrimaryButton';
import { SegmentedControl } from '../../components/atoms/SegmentedControl';
import { TextField } from '../../components/atoms/TextField';
import { TextButton } from '../../components/atoms/TextButton';
import { colors } from '../../theme/ui-reference';

interface Props {
  onAuthenticated: () => void;
}

export function AuthScreen({ onAuthenticated }: Props) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
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
      <KeyboardAvoidingView style={s.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.inner}>
          <Text style={s.logo}>
            Tanya<Text style={s.logoAccent}>.</Text>
          </Text>

          <View style={s.spacer} />

          <Text style={s.heading}>
            {tab === 'login' ? (
              <>Selamat{'\n'}<Text style={s.headingAccent}>kembali.</Text></>
            ) : (
              <>Buat{'\n'}<Text style={s.headingAccent}>akun baru.</Text></>
            )}
          </Text>

          <SegmentedControl
            options={[
              { value: 'login', label: 'Masuk' },
              { value: 'register', label: 'Daftar' },
            ]}
            value={tab}
            onChange={(v) => { setTab(v); setError(undefined); }}
          />

          <View style={s.fields}>
            {tab === 'register' && (
              <TextField
                placeholder="Nama (opsional)"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            )}
            <TextField
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextField
              placeholder="Kata sandi (min. 8 karakter)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {error ? <Text style={s.error}>{error}</Text> : null}

          <PrimaryButton
            label={tab === 'login' ? 'Masuk' : 'Buat akun'}
            onPress={handleSubmit}
            loading={loading}
            style={s.submitBtn}
          />

          <View style={s.spacer} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  kav: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 26, paddingTop: 30, paddingBottom: 20 },
  logo: { fontFamily: 'serif', fontSize: 22, fontWeight: '600', letterSpacing: -0.5, color: colors.ink },
  logoAccent: { color: colors.emerald },
  spacer: { flex: 1, minHeight: 24 },
  heading: { fontFamily: 'serif', fontSize: 28, lineHeight: 36, fontWeight: '500', letterSpacing: -0.4, color: colors.ink, marginBottom: 20 },
  headingAccent: { color: colors.emeraldDark },
  fields: { gap: 12, marginTop: 20, marginBottom: 4 },
  error: { fontSize: 13, color: '#e53e3e', marginTop: 4, marginBottom: 8 },
  submitBtn: { marginTop: 16 },
});
