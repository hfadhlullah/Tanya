import { ScrollView, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { type Question } from '../../api/questions';
import { colors } from '../../theme/ui-reference';
import { AskQuestionPanel } from '../organisms/AskQuestionPanel';
import { QuestionHistoryList } from '../organisms/QuestionHistoryList';

type AskTemplateProps = {
  loading: boolean;
  message?: string;
  questions: Question[];
  onSubmit: (text: string) => Promise<boolean>;
};

export function AskTemplate({ loading, message, questions, onSubmit }: AskTemplateProps) {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AskQuestionPanel loading={loading} message={message} onSubmit={onSubmit} />
        <QuestionHistoryList questions={questions} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.sand50,
    flex: 1,
  },
  content: {
    gap: 24,
    padding: 20,
    paddingTop: 64,
  },
});
