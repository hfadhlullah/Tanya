import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getReviewQueue, type ReviewAnswer } from '../../api/ustadz';
import { BrandText } from '../../components/atoms/BrandText';
import { IconButton } from '../../components/atoms/IconButton';
import { colors } from '../../theme/ui-reference';

type DateFilter = 'all' | 'today';
type TypeFilter = 'all' | 'sensitive' | 'non-sensitive';

interface Props {
  onSelect: (answer: ReviewAnswer, index: number, total: number) => void;
  onBack: () => void;
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function UstadzReviewQueueScreen({ onSelect, onBack }: Props) {
  const [answers, setAnswers] = useState<ReviewAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draftIds, setDraftIds] = useState<Set<string>>(new Set());
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  useEffect(() => { load(dateFilter, typeFilter); }, [dateFilter, typeFilter]);

  async function load(date: DateFilter, type: TypeFilter) {
    setLoading(true);
    setError(null);
    try {
      const filters = {
        ...(date === 'today' ? { date: 'today' as const } : {}),
        ...(type !== 'all' ? { type: type as 'sensitive' | 'non-sensitive' } : {}),
      };
      const data = await getReviewQueue(Object.keys(filters).length ? filters : undefined);
      setAnswers(data.answers);
      // Check which answers have saved drafts
      const keys = await AsyncStorage.getAllKeys();
      const drafted = new Set(
        keys
          .filter((k) => k.startsWith('@tanya_draft_'))
          .map((k) => k.replace('@tanya_draft_', ''))
          .filter((id) => data.answers.some((a) => a.id === id)),
      );
      setDraftIds(drafted);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        <IconButton name="arrow-back-outline" onPress={onBack} />
        <BrandText variant="body" style={styles.title}>
          Antrian Review
        </BrandText>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <Chip label="Semua" active={dateFilter === 'all'} onPress={() => setDateFilter('all')} />
          <Chip label="Hari Ini" active={dateFilter === 'today'} onPress={() => setDateFilter('today')} />
          <View style={styles.filterDivider} />
          <Chip label="Semua Tipe" active={typeFilter === 'all'} onPress={() => setTypeFilter('all')} />
          <Chip label="Sensitif" active={typeFilter === 'sensitive'} onPress={() => setTypeFilter('sensitive')} />
          <Chip label="Tidak Sensitif" active={typeFilter === 'non-sensitive'} onPress={() => setTypeFilter('non-sensitive')} />
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.emerald} />
        </View>
      ) : error ? (
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
                {draftIds.has(item.id) && (
                  <View style={styles.editedBadge}>
                    <Text style={styles.editedBadgeText}>✎ Diedit</Text>
                  </View>
                )}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  container: { flex: 1, backgroundColor: colors.paper },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
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
  editedBadge: {
    backgroundColor: colors.emeraldSoft,
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.emerald,
  },
  editedBadgeText: { fontSize: 11, fontWeight: '700', color: colors.emeraldDark },
  filterBar: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.paper,
  },
  filterScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.line,
    marginHorizontal: 4,
  },
  chip: {
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  chipActive: {
    backgroundColor: colors.emeraldSoft,
    borderColor: colors.emerald,
  },
  chipText: { fontSize: 13, color: colors.muted, fontWeight: '500' },
  chipTextActive: { color: colors.emeraldDark, fontWeight: '700' },
});
