import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { updateProfile } from '../../api/ustadz';
import { BrandText } from '../../components/atoms/BrandText';
import { PrimaryButton } from '../../components/atoms/PrimaryButton';
import { colors } from '../../theme/ui-reference';

interface Props {
  onComplete: () => void;
}

export function UstadzOnboardingScreen({ onComplete }: Props) {
  const [publicName, setPublicName] = useState('');
  const [bio, setBio] = useState('');
  const [credentials, setCredentials] = useState('');
  const [specialtiesRaw, setSpecialtiesRaw] = useState('');
  const [madhhab, setMadhhab] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const name = publicName.trim();
    if (!name) {
      Alert.alert('Nama publik wajib diisi.');
      return;
    }
    const specialties = specialtiesRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (specialties.length === 0) {
      Alert.alert('Masukkan minimal satu bidang keahlian.');
      return;
    }

    setLoading(true);
    try {
      await updateProfile({ publicName: name, bio, credentials, specialties, madhhab });
      onComplete();
    } catch (e: any) {
      Alert.alert('Gagal', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <BrandText variant="title" style={styles.heading}>
          Daftar sebagai Ustadz
        </BrandText>
        <BrandText variant="caption" style={styles.sub}>
          Lengkapi profil Anda untuk mulai menggunakan dashboard ustadz.
        </BrandText>

        <Field label="Nama Publik *">
          <TextInput
            style={styles.input}
            placeholder="Nama yang ditampilkan ke pengguna"
            placeholderTextColor={colors.muted}
            value={publicName}
            onChangeText={setPublicName}
          />
        </Field>

        <Field label="Bio">
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Latar belakang singkat"
            placeholderTextColor={colors.muted}
            value={bio}
            onChangeText={setBio}
            multiline
            textAlignVertical="top"
          />
        </Field>

        <Field label="Bidang Keahlian * (pisah koma)">
          <TextInput
            style={styles.input}
            placeholder="cth: fiqh, akidah, tafsir"
            placeholderTextColor={colors.muted}
            value={specialtiesRaw}
            onChangeText={setSpecialtiesRaw}
          />
        </Field>

        <Field label="Madzhab">
          <TextInput
            style={styles.input}
            placeholder="cth: Syafi'i"
            placeholderTextColor={colors.muted}
            value={madhhab}
            onChangeText={setMadhhab}
          />
        </Field>

        <Field label="Referensi / Ijazah">
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Tuliskan lembaga pendidikan atau referensi Anda"
            placeholderTextColor={colors.muted}
            value={credentials}
            onChangeText={setCredentials}
            multiline
            textAlignVertical="top"
          />
        </Field>

        {loading ? (
          <ActivityIndicator color={colors.emerald} style={styles.btn} />
        ) : (
          <PrimaryButton label="Kirim Pendaftaran" onPress={handleSubmit} style={styles.btn} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <BrandText variant="caption" style={styles.label}>
        {label}
      </BrandText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.paper },
  container: { padding: 24, paddingBottom: 48 },
  heading: { marginBottom: 6 },
  sub: { marginBottom: 28 },
  field: { marginBottom: 18 },
  label: { marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: colors.sand50,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  multiline: { minHeight: 88, paddingTop: 11 },
  btn: { marginTop: 12 },
});
