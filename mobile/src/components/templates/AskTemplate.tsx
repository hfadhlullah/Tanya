import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Linking,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Markdown, { type MarkdownProps } from 'react-native-markdown-display';
import { StatusBar } from 'expo-status-bar';
import { type AuthUser } from '../../api/auth';
import { type Answer, type Question } from '../../api/questions';
import { type ChatSession } from '../../screens/AskScreen';
import { useColors } from '../../theme/ThemeContext';
import { colors } from '../../theme/ui-reference';
import { BottomInputBar } from '../organisms/BottomInputBar';
import { LoginGateModal } from '../organisms/LoginGateModal';
import { SidebarDrawer } from '../organisms/SidebarDrawer';
import { SuggestionChips } from '../molecules/SuggestionChips';
import { IconButton } from '../atoms/IconButton';
import { SegmentedControl } from '../atoms/SegmentedControl';

type AskTemplateProps = {
  loading: boolean;
  pendingMode?: 'conversation' | 'rag';
  answerMode?: 'fast' | 'thinking';
  onAnswerModeChange?: (mode: 'fast' | 'thinking') => void;
  questions: Question[];
  sessions: ChatSession[];
  currentSessionId: string;
  user: AuthUser | null;
  prefill?: string;
  showLoginGate: boolean;
  onSubmit: (text: string) => void;
  onPrefillConsumed: () => void;
  onLoginSuccess: () => void;
  onLoginDismiss: () => void;
  onSuggestionSelect: (text: string) => void;
  onNewChat: () => void;
  onSessionSelect: (sessionId: string) => void;
  onLogout: () => void;
  onLoginPress: () => void;
  onEditQuestion: (question: Question) => void;
  onDeleteSession: (sessionId: string) => void;
  onUserUpdated: (u: AuthUser) => void;
  newAnswerIds: Set<string>;
  guestBlocked?: boolean;
  onBack?: () => void;
};

export function AskTemplate({
  loading,
  pendingMode = 'rag',
  answerMode = 'fast',
  onAnswerModeChange,
  questions,
  sessions,
  currentSessionId,
  user,
  prefill,
  showLoginGate,
  onSubmit,
  onPrefillConsumed,
  onLoginSuccess,
  onLoginDismiss,
  onSuggestionSelect,
  onNewChat,
  onSessionSelect,
  onLogout,
  onLoginPress,
  onEditQuestion,
  onDeleteSession,
  onUserUpdated,
  newAnswerIds,
  guestBlocked,
  onBack,
}: AskTemplateProps) {
  const c = useColors();
  const listRef = useRef<FlatList>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const scrollToBottom = useCallback(() => {
    if (questions.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [questions.length]);

  function handleScroll(event: any) {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    setShowScrollBtn(distanceFromBottom > 120);
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: c.bg }]}>
      <StatusBar style="auto" />

      <SidebarDrawer
        visible={sidebarOpen}
        sessions={sessions}
        currentSessionId={currentSessionId}
        user={user}
        onClose={() => setSidebarOpen(false)}
        onNewChat={() => { setSidebarOpen(false); onNewChat(); }}
        onSessionSelect={(sid) => { setSidebarOpen(false); onSessionSelect(sid); }}
        onLogout={onLogout}
        onLoginPress={onLoginPress}
        onDeleteSession={onDeleteSession}
        onUserUpdated={onUserUpdated}
      />

      {/* Top bar */}
      <View style={[s.topBar, { backgroundColor: c.bg }]}>
        {onBack ? (
          <IconButton name="arrow-back-outline" onPress={onBack} style={s.iconBtn} />
        ) : (
          <IconButton name="menu-outline" onPress={() => setSidebarOpen(true)} style={s.iconBtn} />
        )}
        <Text style={[s.logo, { color: c.ink }]}>
          Tanya<Text style={[s.logoAccent, { color: c.emerald }]}>.</Text>
        </Text>
        <View style={s.iconBtn} />
      </View>

      {/* Content */}
      {questions.length === 0 ? (
        <View style={s.emptyArea}>
          <View style={s.emptyHero}>
            <Text style={[s.emptyTitle, { color: c.ink }]}>
              Mau tanya soal{'\n'}Islam?{' '}
              <Text style={[s.emptyTitleAccent, { color: c.emeraldDark }]}>Sini.</Text>
            </Text>
            <Text style={[s.emptySubtitle, { color: c.muted }]}>Jawaban dari Quran & Sunnah, ditinjau ustadz.</Text>
          </View>
          <SuggestionChips onSelect={onSuggestionSelect} />
        </View>
      ) : (
        <View style={s.listWrap}>
          <FlatList
            ref={listRef}
            data={questions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={s.listContent}
            onContentSizeChange={scrollToBottom}
            onScroll={handleScroll}
            scrollEventThrottle={100}
            renderItem={({ item, index }) => (
              <QuestionTurn
                question={item}
                showDivider={index < questions.length - 1}
                onEdit={onEditQuestion}
                newAnswerIds={newAnswerIds}
                pendingMode={loading && index === questions.length - 1 ? pendingMode : 'rag'}
              />
            )}
            ListHeaderComponent={
              <View style={s.listHeader}>
                <Text style={[s.listHeaderText, { color: c.muted }]}>Riwayat pertanyaan</Text>
              </View>
            }
          />

          {/* Floating scroll-to-bottom button */}
          {showScrollBtn && (
            <TouchableOpacity
              style={[s.scrollBtn, { backgroundColor: c.ink, shadowColor: c.ink }]}
              onPress={scrollToBottom}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-down" size={18} color={c.white} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {pendingMode !== 'conversation' && onAnswerModeChange && (
        <View style={s.answerModeRow}>
          <SegmentedControl
            options={[
              { value: 'fast', label: 'Cepat' },
              { value: 'thinking', label: 'Mendalam' },
            ]}
            value={answerMode}
            onChange={onAnswerModeChange}
          />
        </View>
      )}

      <BottomInputBar
        loading={loading}
        prefill={prefill}
        onSubmit={onSubmit}
        onPrefillConsumed={onPrefillConsumed}
        guestBlocked={guestBlocked}
      />

      <LoginGateModal
        visible={showLoginGate}
        onSuccess={onLoginSuccess}
        onDismiss={onLoginDismiss}
      />
    </SafeAreaView>
  );
}

// ─── Question + Answer turn ───────────────────────────────────────────────────

function QuestionTurn({
  question,
  showDivider,
  onEdit,
  newAnswerIds,
  pendingMode,
}: {
  question: Question;
  showDivider: boolean;
  onEdit: (q: Question) => void;
  newAnswerIds: Set<string>;
  pendingMode: 'conversation' | 'rag';
}) {
  const c = useColors();
  const answer =
    question.answers?.find((a) => a.status === 'VERIFIED') ??
    question.answers?.[0];

  return (
    <View>
      <View style={s.turn}>
        {/* Question bubble — right aligned */}
        <View style={s.bubbleRow}>
          <View style={[s.bubble, { backgroundColor: c.white, borderColor: c.line }]}>
            <Text style={[s.bubbleText, { color: c.ink }]}>{question.text}</Text>
            <View style={s.bubbleFooter}>
              <TouchableOpacity
                style={[s.editBtn, { borderColor: c.line }]}
                onPress={() => onEdit(question)}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil-outline" size={11} color={c.muted} />
                <Text style={[s.editBtnText, { color: c.muted }]}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Answer area */}
        {answer ? (
          <AnswerBlock
            answer={answer}
            animate={newAnswerIds.has(answer.id)}
            isSensitiveQuestion={question.isSensitive}
            questionCreatedAt={question.createdAt}
          />
        ) : (
          <ProcessingIndicator isSensitive={question.isSensitive} mode={pendingMode} />
        )}
      </View>

      {showDivider && <View style={[s.divider, { backgroundColor: c.line }]} />}
    </View>
  );
}

// ─── Processing indicator ─────────────────────────────────────────────────────

function ProcessingIndicator({
  isSensitive,
  mode,
}: {
  isSensitive: boolean;
  mode: 'conversation' | 'rag';
}) {
  const c = useColors();
  const dot1 = useRef(new Animated.Value(0.25)).current;
  const dot2 = useRef(new Animated.Value(0.25)).current;
  const dot3 = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    function pulse(dot: Animated.Value, delay: number) {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.25, duration: 400, useNativeDriver: true }),
          Animated.delay(600),
        ]),
      );
    }
    const a1 = pulse(dot1, 0);
    const a2 = pulse(dot2, 180);
    const a3 = pulse(dot3, 360);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  const label = isSensitive
    ? 'Menunggu tinjauan ustadz…'
    : mode === 'conversation'
      ? 'Thinking...'
      : 'Mencari dari Al-Qur\'an & Hadits…';

  return (
    <View style={s.processingRow}>
      <View style={s.dots}>
        <Animated.View style={[s.dot, { opacity: dot1, backgroundColor: c.emerald }]} />
        <Animated.View style={[s.dot, { opacity: dot2, backgroundColor: c.emerald }]} />
        <Animated.View style={[s.dot, { opacity: dot3, backgroundColor: c.emerald }]} />
      </View>
      <Text style={[s.processingText, { color: c.muted }]}>{label}</Text>
    </View>
  );
}

// ─── Answer block ─────────────────────────────────────────────────────────────

const TYPEWRITER_SPEED = 12; // ms per character

function makeMarkdownStyles(c: ReturnType<typeof useColors>): MarkdownProps['style'] {
  return {
    body: { fontFamily: 'Georgia, serif', fontSize: 15, lineHeight: 26, color: c.ink },
    paragraph: { marginTop: 0, marginBottom: 14 },
    heading1: { fontFamily: 'Georgia, serif', fontSize: 24, lineHeight: 30, color: c.ink, fontWeight: '700', marginTop: 6, marginBottom: 12 },
    heading2: { fontFamily: 'Georgia, serif', fontSize: 21, lineHeight: 28, color: c.ink, fontWeight: '700', marginTop: 4, marginBottom: 10 },
    heading3: { fontFamily: 'Georgia, serif', fontSize: 18, lineHeight: 24, color: c.ink, fontWeight: '700', marginTop: 4, marginBottom: 10 },
    heading4: { fontFamily: 'Georgia, serif', fontSize: 16, lineHeight: 22, color: c.ink, fontWeight: '700', marginTop: 4, marginBottom: 8 },
    heading5: { fontFamily: 'Georgia, serif', fontSize: 15, lineHeight: 22, color: c.ink, fontWeight: '700', marginTop: 2, marginBottom: 8 },
    heading6: { fontFamily: 'Georgia, serif', fontSize: 14, lineHeight: 20, color: c.muted, fontWeight: '700', marginTop: 2, marginBottom: 8 },
    strong: { fontWeight: '700', color: c.ink },
    em: { fontStyle: 'italic' },
    bullet_list: { marginTop: 0, marginBottom: 14 },
    ordered_list: { marginTop: 0, marginBottom: 14 },
    list_item: { marginTop: 0, marginBottom: 8 },
    blockquote: { borderLeftWidth: 3, borderLeftColor: c.emerald, paddingLeft: 12, marginLeft: 0, marginRight: 0, marginTop: 2, marginBottom: 14, opacity: 0.95 },
    code_inline: { backgroundColor: c.emeraldSoft, color: c.emeraldDark, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
    code_block: { backgroundColor: c.white, borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 12, marginTop: 2, marginBottom: 14, color: c.ink },
    fence: { backgroundColor: c.white, borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 12, marginTop: 2, marginBottom: 14, color: c.ink },
    link: { color: c.emeraldDark, textDecorationLine: 'underline' },
    hr: { backgroundColor: c.line, height: 1, marginVertical: 14 },
  };
}

function AnswerMarkdown({ content, showCursor }: { content: string; showCursor: boolean }) {
  const c = useColors();
  const mdStyles = useMemo(() => makeMarkdownStyles(c), [c]);
  return (
    <View style={s.answerTextWrap}>
      <Markdown
        style={mdStyles}
        onLinkPress={(url) => {
          Linking.openURL(url);
          return true;
        }}
      >
        {content}
      </Markdown>
      {showCursor ? <Text style={[s.cursor, { color: c.ink }]}>|</Text> : null}
    </View>
  );
}

function AnswerBlock({
  answer,
  animate,
  isSensitiveQuestion,
  questionCreatedAt,
}: {
  answer: Answer;
  animate: boolean;
  isSensitiveQuestion: boolean;
  questionCreatedAt?: string;
}) {
  const c = useColors();
  const [displayed, setDisplayed] = useState(animate ? '' : answer.body);
  const [done, setDone] = useState(!animate);
  const [liked, setLiked] = useState<'up' | 'down' | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!animate || !answer.body) return;
    setDisplayed('');
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(answer.body.slice(0, i));
      if (i >= answer.body.length) {
        clearInterval(id);
        setDone(true);
      }
    }, TYPEWRITER_SPEED);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer.id]);

  const isEdited = answer.status === 'USTADZ_EDITED';
  const isVerified = answer.status === 'VERIFIED' || isEdited;
  const ustadzName =
    answer.verifyingUstadz?.status === 'APPROVED'
      ? answer.verifyingUstadz.publicName
      : null;
  const thinkingSecs = (() => {
    if (!questionCreatedAt || !answer.createdAt) return null;
    const secs = Math.round(
      (new Date(answer.createdAt).getTime() - new Date(questionCreatedAt).getTime()) / 1000,
    );
    return secs > 0 ? secs : null;
  })();

  const ustadzCorpusCitation = answer.citations?.find(
    (c) =>
      c.source?.type === 'USTADZ_CONTENT' ||
      c.source?.type === 'VERIFIED_ANSWER',
  );
  const hasUstadzCorpus = !!ustadzCorpusCitation;
  // corpus citation label is "Ustadz Ali" — strip "Ustadz " prefix to get name
  const corpusUstadzName = ustadzCorpusCitation?.label?.replace(/^Ustadz\s+/i, '');

  const effectiveUstadzName = ustadzName ?? corpusUstadzName;
  const hasCitations = (answer.citations?.length ?? 0) > 0;
  const isConversational = isVerified && !hasCitations && !answer.label;
  const shouldShowSourceRow =
    !isConversational && (isSensitiveQuestion || isVerified || hasUstadzCorpus || hasCitations || !!answer.label);

  const sourceLabel = isSensitiveQuestion
    ? 'Pertanyaan sensitif · tidak dapat dijawab'
    : isVerified || hasUstadzCorpus
      ? effectiveUstadzName
        ? `Dari Al-Qur'an, Sunnah & ${isEdited ? 'Diperbaiki' : 'Sudah ditinjau'} oleh Ustadz ${effectiveUstadzName}`
        : `Dari Al-Qur'an, Sunnah & ${isEdited ? 'Diperbaiki' : 'Sudah ditinjau'} ustadz`
      : hasCitations
        ? "Dari Al-Qur'an & Sunnah · belum ditinjau ustadz"
      : answer.label
        ? answer.label
        : thinkingSecs
          ? `Berpikir selama ${thinkingSecs} detik`
          : '';

  async function handleCopy() {
    const ok = await Clipboard.setStringAsync(answer.body);
    if (!ok) return;

    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <View style={s.answerBlock}>
      {/* Source label — sits between question and answer prose */}
      {shouldShowSourceRow && (
        <View style={s.sourceRow}>
          <View style={[s.sourceBar, { backgroundColor: c.emerald }]} />
          <Text style={[s.sourceText, { color: c.muted }]}>{sourceLabel}</Text>
        </View>
      )}

      {/* Answer prose */}
      <AnswerMarkdown content={displayed} showCursor={!done} />

      {/* Ustadz verification note */}
      {done && isVerified && ustadzName && (
        <View style={s.ustadzNote}>
          <Text style={[s.ustadzNoteText, { color: c.emeraldDark }]}>
            ✓ {isEdited ? 'Diperbaiki & ditinjau oleh' : 'Ditinjau oleh'}{' '}
            <Text style={[s.sourceUstadzName, { color: c.ink }]}>{ustadzName}</Text>
          </Text>
        </View>
      )}

      {/* Citation pills — deduplicated by label; hidden once ustadz-verified */}
      {done && !isVerified && answer.citations?.length > 0 && (
        <View style={s.citationsRow}>
          {answer.citations
            .filter((cit, i, arr) => arr.findIndex((x) => x.label === cit.label) === i)
            .map((cit) => (
              <View key={cit.id} style={[s.citationPill, { backgroundColor: c.emeraldSoft }]}>
                <Text style={[s.citationPillText, { color: c.emeraldDark }]}>{cit.label}</Text>
              </View>
            ))}
        </View>
      )}

      {/* Actions row — copy / thumbs up / thumbs down */}
      {done && (
        <View style={s.actionsRow}>
          <TouchableOpacity
            style={[s.actionCopy, { backgroundColor: c.white, borderColor: c.line }]}
            onPress={handleCopy}
            activeOpacity={0.7}
          >
            <Ionicons name="copy-outline" size={13} color={c.muted} />
            <Text style={[s.actionCopyText, { color: c.muted }]}>{copied ? 'Tersalin' : 'Salin'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionIcon, { backgroundColor: c.white, borderColor: c.line }, liked === 'up' && { borderColor: c.emerald, backgroundColor: c.emeraldSoft }]}
            onPress={() => setLiked((v) => (v === 'up' ? null : 'up'))}
            activeOpacity={0.7}
          >
            <Ionicons
              name={liked === 'up' ? 'thumbs-up' : 'thumbs-up-outline'}
              size={15}
              color={liked === 'up' ? c.emerald : c.muted}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionIcon, { backgroundColor: c.white, borderColor: c.line }, liked === 'down' && { borderColor: c.emerald, backgroundColor: c.emeraldSoft }]}
            onPress={() => setLiked((v) => (v === 'down' ? null : 'down'))}
            activeOpacity={0.7}
          >
            <Ionicons
              name={liked === 'down' ? 'thumbs-down' : 'thumbs-down-outline'}
              size={15}
              color={liked === 'down' ? c.ink : c.muted}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  answerModeRow: { paddingHorizontal: 16, paddingBottom: 4 },

  // top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.bg,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  logo: { fontFamily: 'serif', fontSize: 20, fontWeight: '600', color: colors.ink, letterSpacing: -0.5 },
  logoAccent: { color: colors.emerald },

  // empty state
  emptyArea: { flex: 1, justifyContent: 'flex-end', paddingBottom: 12 },
  emptyHero: { paddingHorizontal: 24, marginBottom: 8 },
  emptyTitle: {
    fontFamily: 'serif', fontSize: 28, lineHeight: 36,
    fontWeight: '500', color: colors.ink, letterSpacing: -0.4, marginBottom: 8,
  },
  emptyTitleAccent: { color: colors.emeraldDark },
  emptySubtitle: { fontSize: 14, color: colors.muted, lineHeight: 20 },

  // list
  listWrap: { flex: 1, position: 'relative' },
  listContent: { paddingHorizontal: 16, paddingBottom: 20, gap: 0 },
  listHeader: { paddingTop: 16, paddingBottom: 12 },
  listHeaderText: {
    fontSize: 11, fontWeight: '700', color: colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },

  // scroll button
  scrollBtn: {
    position: 'absolute', bottom: 12, right: 12,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.ink,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.ink, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 6,
  },

  // turn + divider
  turn: { paddingVertical: 16, gap: 12 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 4 },

  // question bubble
  bubbleRow: { alignItems: 'flex-end' },
  bubble: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    maxWidth: '82%',
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
  },
  bubbleText: { fontSize: 15, color: colors.ink, lineHeight: 22, fontWeight: '500' },
  bubbleFooter: { flexDirection: 'row', justifyContent: 'flex-end' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: colors.line,
  },
  editBtnText: { fontSize: 11, color: colors.muted },

  // processing
  processingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 2 },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.emerald },
  processingText: { fontSize: 13, color: colors.muted, fontStyle: 'italic' },

  // answer block
  answerBlock: { gap: 12, paddingLeft: 2 },

  // source label
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sourceBar: { width: 2, height: 16, borderRadius: 1 },
  sourceBarCorpus: { backgroundColor: colors.emerald },
  sourceBarUstadz: { backgroundColor: colors.muted },
  sourceText: { fontSize: 12, color: colors.muted, fontWeight: '500', flex: 1 },
  sourceUstadzName: { color: colors.ink, fontWeight: '700' },
  verifiedPill: { color: colors.emeraldDark, fontWeight: '700' },
  ustadzNote: { marginTop: 8, flexDirection: 'row', alignItems: 'center' },
  ustadzNoteText: { fontSize: 12, color: colors.emeraldDark, fontWeight: '500' },

  // answer prose
  answerTextWrap: { position: 'relative' },
  cursor: { color: colors.ink, fontWeight: '300' },

  // citations
  citationsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  citationPill: {
    backgroundColor: colors.emeraldSoft,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  citationPillText: { fontSize: 11, color: colors.emeraldDark, fontWeight: '500' },

  // actions
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionCopy: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 12, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.white,
  },
  actionCopyText: { fontSize: 12, color: colors.muted },
  actionIcon: {
    width: 34, height: 34, borderRadius: 10,
    borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  actionIconActive: {
    borderColor: colors.emerald,
    backgroundColor: colors.emeraldSoft,
  },
});
