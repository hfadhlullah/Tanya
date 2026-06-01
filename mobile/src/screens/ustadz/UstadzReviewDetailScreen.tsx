import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { verifyAnswer, type ReviewAnswer } from '../../api/ustadz';
import { BrandText } from '../../components/atoms/BrandText';
import { TextArea } from '../../components/atoms/TextArea';
import { PrimaryButton } from '../../components/atoms/PrimaryButton';
import { colors } from '../../theme/ui-reference';

interface Props {
  answer: ReviewAnswer;
  onDone: () => void;
  onBack: () => void;
}

export function UstadzReviewDetailScreen({ answer, onDone, onBack }: Props) {
  const [editedBody, setEditedBody] = useState(answer.body);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleVerify() {
    setLoading(true);
    try {
      const changed = editedBody.trim() !== answer.body.trim();
      await verifyAnswer(answer.id, changed ? editedBody.trim() : undefined);
      setSuccess(true);
    } catch (e: any) {
      const { Alert } = require('react-native');
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
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <BrandText variant="caption" style={styles.backText}>
            ← Kembali
          </BrandText>
        </TouchableOpacity>
        <BrandText variant="body" style={styles.title}>
          Tinjau Jawaban
        </BrandText>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.questionCard}>
          <View style={styles.row}>
            {answer.question.isSensitive && (
              <View style={styles.sensitiveBadge}>
                <BrandText variant="caption" style={styles.sensitiveText}>Sensitif</BrandText>
              </View>
            )}
            {answer.question.topic ? (
              <BrandText variant="caption" style={styles.topic}>{answer.question.topic}</BrandText>
            ) : null}
          </View>
          <BrandText variant="body" style={styles.questionText}>{answer.question.text}</BrandText>
        </View>

        <BrandText variant="caption" style={styles.sectionLabel}>Jawaban AI</BrandText>
        <BrandText variant="caption" style={styles.hint}>Edit jika perlu, lalu verifikasi.</BrandText>
        <TextArea value={editedBody} onChangeText={setEditedBody} style={styles.editor} />

        {answer.citations.length > 0 && (
          <View style={styles.citationsSection}>
            <BrandText variant="caption" style={styles.sectionLabel}>Sumber</BrandText>
            {answer.citations.map((c) => (
              <View key={c.id} style={styles.citationRow}>
                <BrandText variant="caption" style={styles.citationLabel}>{c.label}</BrandText>
                <BrandText variant="caption" style={styles.citationExcerpt} numberOfLines={2}>
                  {c.excerpt}
                </BrandText>
              </View>
            ))}
          </View>
        )}

        {success ? (
          <View style={styles.successBanner}>
            <BrandText variant="body" style={styles.successTitle}>✓ Jawaban berhasil diverifikasi</BrandText>
            <BrandText variant="caption" style={styles.successSub}>
              Jawaban ini akan dikirim ke pengguna berikutnya yang bertanya hal serupa.
            </BrandText>
            <PrimaryButton label="Kembali ke Antrian" onPress={onDone} style={styles.btn} />
          </View>
        ) : loading ? (
          <ActivityIndicator color={colors.emerald} style={styles.btn} />
        ) : (
          <PrimaryButton label="Verifikasi & Publikasikan" onPress={handleVerify} style={styles.btn} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.paper },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  backBtn: { marginRight: 12, padding: 4 },
  backText: { color: colors.emerald },
  title: { fontWeight: '700' },
  content: { padding: 20, paddingBottom: 48 },
  questionCard: {
    backgroundColor: colors.emeraldTint,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 8,
  },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  sensitiveBadge: { backgroundColor: '#fef3c7', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  sensitiveText: { color: '#b45309', fontWeight: '600' },
  topic: { color: colors.muted },
  questionText: { fontWeight: '600', fontSize: 17 },
  sectionLabel: { fontWeight: '600', color: colors.muted, marginBottom: 4 },
  hint: { marginBottom: 10 },
  editor: { marginBottom: 24 },
  citationsSection: { marginBottom: 24, gap: 10 },
  citationRow: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    gap: 4,
  },
  citationLabel: { fontWeight: '700', color: colors.ink },
  citationExcerpt: { color: colors.muted },
  btn: { marginTop: 4 },
  successBanner: {
    backgroundColor: colors.emeraldSoft,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    gap: 8,
  },
  successTitle: { fontWeight: '700', color: colors.emerald },
  successSub: { color: colors.muted },
});
