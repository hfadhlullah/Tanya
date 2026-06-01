import { StyleSheet, View } from 'react-native';
import { type Question } from '../../api/questions';
import { BrandText } from '../atoms/BrandText';
import { QuestionHistoryItem } from '../molecules/QuestionHistoryItem';

type QuestionHistoryListProps = {
  questions: Question[];
};

export function QuestionHistoryList({ questions }: QuestionHistoryListProps) {
  return (
    <View style={styles.container}>
      <BrandText variant="body" style={styles.heading}>
        Riwayat pertanyaan
      </BrandText>
      {questions.length === 0 ? (
        <BrandText variant="caption">Belum ada pertanyaan. Mulai dari satu hal yang paling mengganjal.</BrandText>
      ) : (
        questions.map((question) => <QuestionHistoryItem key={question.id} question={question} />)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  heading: {
    fontWeight: '800',
  },
});
