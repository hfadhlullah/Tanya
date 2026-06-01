import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { getReviewQueue, type ReviewAnswer } from '../../api/ustadz';
import { BrandText } from '../../components/atoms/BrandText';
import { colors } from '../../theme/ui-reference';

interface Props {
  onSelect: (answer: ReviewAnswer, index: number, total: number) => void;
  onBack: () => void;
}

export function UstadzReviewQueueScreen({ onSelect, onBack }: Props) {
  const [answers, setAnswers] = useState<ReviewAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await getReviewQueue();
      setAnswers(data.answers);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.emerald} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <BrandText variant="caption" style={styles.backText}>
            ← Kembali
          </BrandText>
        </TouchableOpacity>
        <BrandText variant="body" style={styles.title}>
          Antrian Review
        </BrandText>
      </View>

      {error ? (
        <View style={styles.center}>
          <BrandText variant="caption">{error}</BrandText>
        </View>
      ) : answers.length === 0 ? (
        <View style={styles.center}>
          <BrandText variant="caption">Tidak ada jawaban yang perlu ditinjau.</BrandText>
        </View>
      ) : (
        <FlatList
          data={answers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <TouchableOpacity style={styles.card} onPress={() => onSelect(item, index, answers.length)}>
              <View style={styles.cardTop}>
                {item.question.isSensitive && (
                  <View style={styles.sensitiveBadge}>
                    <BrandText variant="caption" style={styles.sensitiveText}>
                      Sensitif
                    </BrandText>
                  </View>
                )}
                {item.question.topic ? (
                  <BrandText variant="caption" style={styles.topic}>
                    {item.question.topic}
                  </BrandText>
                ) : null}
              </View>
              <BrandText variant="body" style={styles.questionText} numberOfLines={2}>
                {item.question.text}
              </BrandText>
              <BrandText variant="caption" style={styles.preview} numberOfLines={2}>
                {item.body}
              </BrandText>
              {item.citations.length > 0 && (
                <BrandText variant="caption" style={styles.citationCount}>
                  {item.citations.length} sumber
                </BrandText>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  container: { flex: 1, backgroundColor: colors.paper },
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
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 6,
  },
  cardTop: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  sensitiveBadge: { backgroundColor: '#fef3c7', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  sensitiveText: { color: '#b45309', fontWeight: '600' },
  topic: { color: colors.muted },
  questionText: { fontWeight: '600' },
  preview: { color: colors.muted },
  citationCount: { color: colors.emerald, fontWeight: '600' },
});
