import { useRef, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { type AuthUser } from '../../api/auth';
import { type Question } from '../../api/questions';
import { type ChatSession } from '../../screens/AskScreen';
import { colors } from '../../theme/ui-reference';
import { BottomInputBar } from '../organisms/BottomInputBar';
import { LoginGateModal } from '../organisms/LoginGateModal';
import { SidebarDrawer } from '../organisms/SidebarDrawer';
import { SuggestionChips } from '../molecules/SuggestionChips';

type AskTemplateProps = {
  loading: boolean;
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
};

export function AskTemplate({
  loading,
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
}: AskTemplateProps) {
  const listRef = useRef<FlatList>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function scrollToBottom() {
    if (questions.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="dark" />

      {/* Sidebar */}
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
      />

      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.iconBtn} onPress={() => setSidebarOpen(true)} activeOpacity={0.7}>
          <Ionicons name="menu-outline" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={s.logo}>
          Tanya<Text style={s.logoAccent}>.</Text>
        </Text>
      </View>

      {/* Content area */}
      {questions.length === 0 ? (
        <View style={s.emptyArea}>
          <View style={s.emptyHero}>
            <Text style={s.emptyTitle}>
              Mau tanya soal{'\n'}Islam?{' '}
              <Text style={s.emptyTitleAccent}>Sini.</Text>
            </Text>
            <Text style={s.emptySubtitle}>
              Jawaban dari Quran & Sunnah, ditinjau ustadz.
            </Text>
          </View>
          <SuggestionChips onSelect={onSuggestionSelect} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={questions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          onContentSizeChange={scrollToBottom}
          renderItem={({ item }) => <QuestionBubble question={item} />}
          ListHeaderComponent={
            <View style={s.listHeader}>
              <Text style={s.listHeaderText}>Riwayat pertanyaan</Text>
            </View>
          }
        />
      )}

      {/* Bottom input */}
      <BottomInputBar
        loading={loading}
        prefill={prefill}
        onSubmit={onSubmit}
        onPrefillConsumed={onPrefillConsumed}
      />

      {/* Login gate modal */}
      <LoginGateModal
        visible={showLoginGate}
        onSuccess={onLoginSuccess}
        onDismiss={onLoginDismiss}
      />
    </SafeAreaView>
  );
}

function QuestionBubble({ question }: { question: Question }) {
  const answer = question.answers?.[0];
  return (
    <View style={s.turn}>
      {/* User question — right aligned */}
      <View style={s.bubbleRow}>
        <View style={s.bubble}>
          <Text style={s.bubbleText}>{question.text}</Text>
          <View style={s.bubbleMeta}>
            <Text style={[s.statusDot, question.isSensitive ? s.dotSensitive : s.dotSafe]}>●</Text>
            <Text style={s.statusText}>
              {question.isSensitive ? 'Menunggu tinjauan ustadz' : 'Masuk alur jawaban'}
            </Text>
          </View>
        </View>
      </View>

      {/* Answer — left aligned */}
      {answer ? (
        <View style={s.answerRow}>
          <View style={s.answerBubble}>
            <Text style={s.answerText}>{answer.body}</Text>
            {answer.citations?.length > 0 && (
              <View style={s.citationsWrap}>
                {answer.citations.map((c) => (
                  <Text key={c.id} style={s.citationText}>· {c.label}</Text>
                ))}
              </View>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.bg,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontFamily: 'serif',
    fontSize: 20,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: -0.5,
  },
  logoAccent: {
    color: colors.emerald,
  },
  // empty state
  emptyArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 12,
  },
  emptyHero: {
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: 'serif',
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '500',
    color: colors.ink,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  emptyTitleAccent: {
    color: colors.emeraldDark,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },

  // list
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  listHeader: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  listHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // bubbles
  turn: {
    gap: 6,
  },
  bubbleRow: {
    alignItems: 'flex-end',
  },
  answerRow: {
    alignItems: 'flex-start',
  },
  answerBubble: {
    backgroundColor: colors.emerald + '18',
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    padding: 14,
    maxWidth: '85%',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.emerald + '40',
  },
  answerText: {
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
  },
  citationsWrap: {
    gap: 2,
    marginTop: 4,
  },
  citationText: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 16,
  },
  bubble: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderBottomRightRadius: 4,
    padding: 14,
    maxWidth: '85%',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  bubbleText: {
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
    fontWeight: '500',
  },
  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    fontSize: 8,
  },
  dotSafe: {
    color: colors.emerald,
  },
  dotSensitive: {
    color: colors.muted,
  },
  statusText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500',
  },
});
