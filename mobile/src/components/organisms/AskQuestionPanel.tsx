import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '../../theme/ui-reference';
import { BrandText } from '../atoms/BrandText';
import { PrimaryButton } from '../atoms/PrimaryButton';
import { TextArea } from '../atoms/TextArea';
import { TrustPill } from '../molecules/TrustPill';

type AskQuestionPanelProps = {
  loading: boolean;
  message?: string;
  onSubmit: (text: string) => Promise<boolean>;
};

export function AskQuestionPanel({ loading, message, onSubmit }: AskQuestionPanelProps) {
  const [text, setText] = useState('');

  async function handleSubmit() {
    const nextText = text.trim();

    if (!nextText) {
      return;
    }

    const didSubmit = await onSubmit(nextText);

    if (didSubmit) {
      setText('');
    }
  }

  return (
    <View style={styles.card}>
      <TrustPill />
      <BrandText variant="title" style={styles.title}>
        Mau tanya soal Islam? Sini.
      </BrandText>
      <BrandText style={styles.body}>
        Tulis dengan bahasa sehari-hari. Tanya akan cek dulu apakah ini perlu langsung ke ustadz.
      </BrandText>
      <TextArea
        editable={!loading}
        maxLength={2000}
        onChangeText={setText}
        placeholder="Contoh: Bagaimana cara memperbaiki salat yang sering tertinggal?"
        value={text}
      />
      <BrandText variant="caption">{text.length}/2000</BrandText>
      <PrimaryButton disabled={loading || !text.trim()} label="Kirim pertanyaan" onPress={handleSubmit} />
      {loading ? <ActivityIndicator color={colors.emerald800} /> : null}
      {message ? <BrandText variant="caption">{message}</BrandText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 32,
    gap: 16,
    padding: 22,
  },
  title: {
    color: colors.emerald900,
  },
  body: {
    color: colors.ink600,
  },
});
