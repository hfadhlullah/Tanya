import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { updateProfile } from '../../api/ustadz';
import { BrandText } from '../../components/atoms/BrandText';
import { PrimaryButton } from '../../components/atoms/PrimaryButton';
import { TextField } from '../../components/atoms/TextField';
import { TextArea } from '../../components/atoms/TextArea';
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
    if (!name) { Alert.alert('Nama publik wajib diisi.'); return; }
    const specialties = specialtiesRaw.split(',').map((s) => s.trim()).filter(Boolean);
    if (specialties.length === 0) { Alert.alert('Masukkan minimal satu bidang keahlian.'); return; }

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
    <SafeAreaView style={s.root}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={s.flex} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <BrandText variant="title" style={s.heading}>Daftar sebagai Ustadz</BrandText>
          <BrandText variant="caption" style={s.sub}>
            Lengkapi profil Anda untuk mulai menggunakan dashboard ustadz.
          </BrandText>

          <View style={s.fields}>
            <Field label="Nama Publik *">
              <TextField placeholder="Nama yang ditampilkan ke pengguna" value={publicName} onChangeText={setPublicName} />
            </Field>
            <Field label="Bio">
              <TextArea placeholder="Latar belakang singkat" value={bio} onChangeText={setBio} />
            </Field>
            <Field label="Bidang Keahlian * (pisah koma)">
              <TextField placeholder="cth: fiqh, akidah, tafsir" value={specialtiesRaw} onChangeText={setSpecialtiesRaw} />
            </Field>
            <Field label="Madzhab">
              <TextField placeholder="cth: Syafi'i" value={madhhab} onChangeText={setMadhhab} />
            </Field>
            <Field label="Referensi / Ijazah">
              <TextArea placeholder="Tuliskan lembaga pendidikan atau referensi Anda" value={credentials} onChangeText={setCredentials} />
            </Field>
          </View>

          <PrimaryButton label="Kirim Pendaftaran" onPress={handleSubmit} loading={loading} style={s.btn} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.field}>
      <BrandText variant="caption" style={s.fieldLabel}>{label}</BrandText>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  heading: { marginBottom: 6 },
  sub: { marginBottom: 28 },
  fields: { gap: 16 },
  field: { gap: 6 },
  fieldLabel: { fontWeight: '600' },
  btn: { marginTop: 24 },
});
