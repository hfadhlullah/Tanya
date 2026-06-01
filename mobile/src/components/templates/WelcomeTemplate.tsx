import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BrandText } from '../atoms/BrandText';
import { PrimaryButton } from '../atoms/PrimaryButton';
import { TrustPill } from '../molecules/TrustPill';
import { colors, uiReference } from '../../theme/ui-reference';

export function WelcomeTemplate() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.card}>
        <TrustPill />
        <BrandText variant="title" style={styles.title}>
          Tanya apa saja soal Islam, dengan sumber yang jelas.
        </BrandText>
        <BrandText style={styles.body}>
          Jawaban cepat dari sumber tepercaya, lalu ditingkatkan dengan verifikasi ustadz saat dibutuhkan.
        </BrandText>
        <PrimaryButton label="Mulai bertanya" />
        <BrandText variant="caption">UI reference: {uiReference.source}</BrandText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.sand50,
    justifyContent: 'flex-end',
    padding: 20,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 32,
    gap: 18,
    padding: 24,
  },
  title: {
    color: colors.emerald900,
  },
  body: {
    color: colors.ink600,
  },
});
