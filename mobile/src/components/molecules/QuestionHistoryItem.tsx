import { StyleSheet, View } from 'react-native';
import { type Question } from '../../api/questions';
import { colors } from '../../theme/ui-reference';
import { BrandText } from '../atoms/BrandText';

type QuestionHistoryItemProps = {
  question: Question;
};

export function QuestionHistoryItem({ question }: QuestionHistoryItemProps) {
  const hasAnswer = question.answers.length > 0;

  return (
    <View style={styles.card}>
      <BrandText style={styles.text}>{question.text}</BrandText>
      <BrandText variant="caption" style={question.isSensitive ? styles.sensitive : styles.safe}>
        {question.isSensitive
          ? hasAnswer
            ? 'Pertanyaan sensitif · tidak dijawab'
            : 'Menunggu tinjauan ustadz'
          : 'Masuk alur jawaban'}
      </BrandText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    gap: 8,
    padding: 16,
  },
  text: {
    color: colors.ink900,
    fontWeight: '600',
  },
  safe: {
    color: colors.emerald800,
    fontWeight: '700',
  },
  sensitive: {
    color: colors.ink600,
    fontWeight: '700',
  },
});
