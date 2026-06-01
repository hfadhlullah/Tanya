import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { login, register } from '../../api/auth';
import { PrimaryButton } from '../atoms/PrimaryButton';
import { SegmentedControl } from '../atoms/SegmentedControl';
import { TextButton } from '../atoms/TextButton';
import { TextField } from '../atoms/TextField';
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
            <View style={s.handle} />

            <View style={s.eyebrowRow}>
              <Ionicons name="checkmark-circle" size={14} color={colors.emeraldDark} />
              <Text style={s.eyebrow}>Pertanyaanmu sudah diterima</Text>
            </View>
            <Text style={s.h}>
              Simpan riwayat &{'\n'}
              <Text style={s.hAccent}>tanya lebih banyak.</Text>
            </Text>
            <Text style={s.sub}>
              Buat akun gratis untuk menyimpan jawabanmu & lanjut bertanya.
            </Text>

            <SegmentedControl
              options={[
                { value: 'register', label: 'Daftar' },
                { value: 'login', label: 'Sudah punya akun' },
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
              label={tab === 'register' ? 'Buat akun' : 'Masuk'}
              onPress={handleSubmit}
              loading={loading}
            />

            <TextButton label="Nanti saja" onPress={onDismiss} />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(13,33,26,0.5)', justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    gap: 12,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.line,
    alignSelf: 'center', marginBottom: 8,
  },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eyebrow: { fontSize: 12, color: colors.emeraldDark, fontWeight: '700', letterSpacing: 0.3 },
  h: { fontFamily: 'serif', fontSize: 26, lineHeight: 33, fontWeight: '500', color: colors.ink, letterSpacing: -0.4 },
  hAccent: { color: colors.emeraldDark },
  sub: { fontSize: 14, color: colors.muted, lineHeight: 21 },
  fields: { gap: 10 },
  error: { fontSize: 13, color: '#e53e3e' },
});
