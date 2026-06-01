import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { verifyAnswer, type ReviewAnswer } from '../../api/ustadz';
import { colors } from '../../theme/ui-reference';

interface Props {
  answer: ReviewAnswer;
  queuePosition?: { index: number; total: number };
  onDone: () => void;
  onBack: () => void;
}

export function UstadzReviewDetailScreen({ answer, queuePosition, onDone, onBack }: Props) {
  const [editedBody, setEditedBody] = useState(answer.body);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [citationsOpen, setCitationsOpen] = useState(true);
  const [reviewerNote, setReviewerNote] = useState('');

  const successScale = useRef(new Animated.Value(0.5)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  const isChanged = editedBody.trim() !== answer.body.trim();
  const charCount = editedBody.length;

  useEffect(() => {
    if (success) {
      Animated.parallel([
        Animated.spring(successScale, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 150 }),
        Animated.timing(successOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [success]);

  async function handleVerify() {
    setLoading(true);
    try {
      const changed = editedBody.trim() !== answer.body.trim();
      await verifyAnswer(answer.id, changed ? editedBody.trim() : undefined);
      setSuccess(true);
    } catch (e: any) {
      Alert.alert('Gagal', e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleDraft() {
    Alert.alert('Simpan Draft', 'Fitur ini akan segera tersedia.');
  }

  function handleFlag() {
    Alert.alert('Tandai Bermasalah', 'Fitur ini akan segera tersedia.');
  }

  // ── SUCCESS STATE ──────────────────────────────
  if (success) {
    const remaining = queuePosition ? queuePosition.total - queuePosition.index - 1 : null;

    return (
      <View style={s.flex}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={onBack} style={s.backBtn} hitSlop={8}>
            <Text style={s.backChevron}>‹</Text>
          </TouchableOpacity>
          <Text style={s.topBarTitle}>Tinjau Jawaban</Text>
          <View style={s.topBarRight} />
        </View>

        <Animated.View style={[s.successWrap, { opacity: successOpacity }]}>
          {/* Ring */}
          <Animated.View style={[s.successRing, { transform: [{ scale: successScale }] }]}>
            <Text style={s.successCheck}>✓</Text>
          </Animated.View>

          <View style={s.successTextBlock}>
            <Text style={s.successTitle}>Jawaban Diverifikasi</Text>
            <Text style={s.successSub}>
              Akan dikirim ke pengguna berikutnya yang bertanya tentang topik ini.
            </Text>
          </View>

          {/* Stats */}
          {queuePosition && (
            <View style={s.statsCard}>
              <View style={s.statItem}>
                <Text style={s.statNum}>{remaining ?? 0}</Text>
                <Text style={s.statLabel}>Tersisa</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={[s.statNum, { color: colors.emerald }]}>1</Text>
                <Text style={s.statLabel}>Hari ini</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={s.statNum}>{queuePosition.index + 1}/{queuePosition.total}</Text>
                <Text style={s.statLabel}>Posisi</Text>
              </View>
            </View>
          )}

          <View style={s.successActions}>
            <Pressable
              style={({ pressed }) => [s.primaryBtn, pressed && s.primaryBtnPressed]}
              onPress={onDone}
            >
              <Text style={s.primaryBtnText}>Lanjut ke Antrian →</Text>
            </Pressable>
            <TouchableOpacity onPress={onBack} hitSlop={8} style={s.ghostBtn}>
              <Text style={s.ghostBtnText}>Kembali ke Dashboard</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  }

  // ── REVIEW / EDIT STATE ───────────────────────
  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* Top Bar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={onBack} style={s.backBtn} hitSlop={8}>
          <Text style={s.backChevron}>‹</Text>
        </TouchableOpacity>
        <View style={s.topBarCenter}>
          <Text style={s.topBarTitle}>Tinjau Jawaban</Text>
          {queuePosition && (
            <Text style={s.topBarSub}>{queuePosition.index + 1} dari {queuePosition.total} dalam antrian</Text>
          )}
        </View>
        <View style={[s.statusPill, s.topBarRight]}>
          <Text style={s.statusPillText}>Menunggu</Text>
        </View>
      </View>

      <ScrollView
        style={s.flex}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Question Card */}
        <View style={s.questionCard}>
          <View style={s.badgeRow}>
            {answer.question.topic ? (
              <View style={s.badgeTopic}>
                <Text style={s.badgeTopicText}>{answer.question.topic}</Text>
              </View>
            ) : null}
            {answer.question.isSensitive && (
              <View style={s.badgeSensitive}>
                <Text style={s.badgeSensitiveText}>⚠ Sensitif</Text>
              </View>
            )}
          </View>
          <Text style={s.questionText}>{answer.question.text}</Text>
        </View>

        {/* Answer Editor */}
        <View style={s.section}>
          {/* Label row */}
          <View style={s.editorLabelRow}>
            <View style={s.editorLabelLeft}>
              <Text style={s.sectionLabel}>Jawaban AI</Text>
              {isChanged && (
                <>
                  <View style={s.changedDot} />
                  <Text style={s.changedText}>Diubah</Text>
                </>
              )}
            </View>
            <Text style={s.charCount}>{charCount} karakter</Text>
          </View>

          {/* Editor box */}
          <View style={s.editorBox}>
            {/* Toolbar */}
            <View style={s.editorToolbar}>
              <TouchableOpacity
                onPress={() => setEditedBody(answer.body)}
                style={s.toolbarBtn}
                hitSlop={6}
              >
                <Text style={s.toolbarBtnText}>⟳ Reset ke AI</Text>
              </TouchableOpacity>
            </View>
            {/* Text area */}
            <TextInput
              style={s.editorInput}
              value={editedBody}
              onChangeText={setEditedBody}
              multiline
              textAlignVertical="top"
              placeholderTextColor={colors.muted}
            />
          </View>
        </View>

        {/* Citations */}
        {answer.citations.length > 0 && (
          <View style={s.section}>
            <TouchableOpacity
              style={s.citationsHeader}
              onPress={() => setCitationsOpen((v) => !v)}
              hitSlop={6}
            >
              <Text style={s.sectionLabel}>Sumber ({answer.citations.length})</Text>
              <Text style={s.citationsToggle}>{citationsOpen ? '▲ Sembunyikan' : '▼ Tampilkan'}</Text>
            </TouchableOpacity>
            {citationsOpen && (
              <View style={s.citationsList}>
                {answer.citations.map((c) => (
                  <View key={c.id} style={s.citationRow}>
                    <Text style={s.citationLabel}>{c.label}</Text>
                    <Text style={s.citationExcerpt} numberOfLines={2}>{c.excerpt}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Reviewer Notes */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>
            Catatan Reviewer{' '}
            <Text style={s.sectionLabelOptional}>(opsional)</Text>
          </Text>
          <TextInput
            style={s.notesInput}
            value={reviewerNote}
            onChangeText={setReviewerNote}
            multiline
            textAlignVertical="top"
            placeholder="Tambahkan catatan internal..."
            placeholderTextColor={colors.muted}
          />
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={s.ctaBar}>
        {loading ? (
          <ActivityIndicator color={colors.emerald} style={{ marginVertical: 16 }} />
        ) : (
          <>
            <Pressable
              style={({ pressed }) => [s.primaryBtn, pressed && s.primaryBtnPressed]}
              onPress={handleVerify}
            >
              <Text style={s.primaryBtnText}>Verifikasi &amp; Publikasikan</Text>
            </Pressable>
            <View style={s.ctaSecondaryRow}>
              <TouchableOpacity style={s.secondaryBtn} onPress={handleDraft}>
                <Text style={s.secondaryBtnText}>Simpan Draft</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.secondaryBtn, s.flagBtn]} onPress={handleFlag}>
                <Text style={s.flagBtnText}>⚑ Bermasalah</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.paper },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.white,
    gap: 10,
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: 14,
    backgroundColor: colors.emeraldTint,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  backChevron: { fontSize: 24, color: colors.emerald, fontWeight: '700', marginTop: -2 },
  topBarCenter: { flex: 1 },
  topBarTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  topBarSub: { fontSize: 12, color: colors.muted, marginTop: 1 },
  topBarRight: { flexShrink: 0 },
  statusPill: {
    backgroundColor: colors.emeraldTint,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: { fontSize: 11, fontWeight: '600', color: colors.muted },

  // Scroll
  scrollContent: { padding: 16, paddingBottom: 24, gap: 20 },

  // Question card
  questionCard: {
    backgroundColor: colors.emeraldTint,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badgeTopic: {
    backgroundColor: colors.emeraldSoft,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeTopicText: { fontSize: 12, fontWeight: '600', color: colors.emeraldDark },
  badgeSensitive: {
    backgroundColor: '#fef3c7',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeSensitiveText: { fontSize: 12, fontWeight: '600', color: '#92400e' },
  questionText: { fontSize: 17, fontWeight: '700', color: colors.ink, lineHeight: 25 },

  // Section wrapper
  section: { gap: 8 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionLabelOptional: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.line,
    textTransform: 'none',
    letterSpacing: 0,
  },

  // Editor
  editorLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editorLabelLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  changedDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.emerald },
  changedText: { fontSize: 11, fontWeight: '600', color: colors.emerald },
  charCount: { fontSize: 11, color: colors.muted },
  editorBox: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 20,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  editorToolbar: {
    backgroundColor: colors.emeraldTint,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 16,
  },
  toolbarBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  toolbarBtnText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  editorInput: {
    padding: 16,
    fontSize: 15,
    lineHeight: 24,
    color: colors.ink,
    minHeight: 180,
  },

  // Citations
  citationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  citationsToggle: { fontSize: 12, fontWeight: '600', color: colors.emerald },
  citationsList: { gap: 8 },
  citationRow: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  citationLabel: { fontSize: 12, fontWeight: '700', color: colors.ink },
  citationExcerpt: { fontSize: 12, color: colors.muted, lineHeight: 17 },

  // Reviewer notes
  notesInput: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.ink,
    minHeight: 56,
  },

  // Sticky CTA
  ctaBar: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: colors.emeraldDark,
    borderRadius: 20,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnPressed: { backgroundColor: colors.emerald900 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: colors.white, letterSpacing: -0.2 },
  ctaSecondaryRow: { flexDirection: 'row', gap: 8 },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: colors.paper,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  flagBtn: { borderColor: '#fecaca', backgroundColor: '#fff7f7' },
  flagBtnText: { fontSize: 13, fontWeight: '600', color: '#ef4444' },

  // Success state
  successWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 24,
  },
  successRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.emeraldSoft,
    borderWidth: 3,
    borderColor: colors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCheck: { fontSize: 44, color: colors.emerald, lineHeight: 52 },
  successTextBlock: { alignItems: 'center', gap: 8 },
  successTitle: { fontSize: 22, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
  successSub: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 260,
  },
  statsCard: {
    width: '100%',
    backgroundColor: colors.emeraldTint,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: { alignItems: 'center', gap: 3 },
  statNum: { fontSize: 24, fontWeight: '800', color: colors.ink, lineHeight: 28 },
  statLabel: { fontSize: 12, color: colors.muted },
  statDivider: { width: 1, height: 32, backgroundColor: colors.line },
  successActions: { width: '100%', gap: 10, alignItems: 'center' },
  ghostBtn: { paddingVertical: 8 },
  ghostBtnText: { fontSize: 14, fontWeight: '500', color: colors.muted },
});
