import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RENAME_KEY = '@tanya_session_titles';
import { type AuthUser } from '../../api/auth';
import { type ChatSession } from '../../screens/AskScreen';

const DRAWER_WIDTH = Dimensions.get('window').width * 0.82;

const d = {
  bg: '#0d1f18',
  surface: '#122d1f',
  border: '#1d3d2a',
  text: '#e8f5ef',
  muted: '#6b9980',
  accent: '#0e9f6e',
  newChatBg: '#122d1f',
};

interface Props {
  visible: boolean;
  sessions: ChatSession[];
  currentSessionId: string;
  user: AuthUser | null;
  onClose: () => void;
  onNewChat: () => void;
  onSessionSelect: (sessionId: string) => void;
  onLogout: () => void;
  onLoginPress: () => void;
}

export function SidebarDrawer({ visible, sessions, currentSessionId, user, onClose, onNewChat, onSessionSelect, onLogout, onLoginPress }: Props) {
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const [profileOpen, setProfileOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [titles, setTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    AsyncStorage.getItem(RENAME_KEY).then((raw) => {
      if (raw) setTitles(JSON.parse(raw));
    });
  }, []);

  async function saveTitles(next: Record<string, string>) {
    setTitles(next);
    await AsyncStorage.setItem(RENAME_KEY, JSON.stringify(next));
  }

  function startRename(sessionId: string, currentTitle: string) {
    setRenamingId(sessionId);
    setRenameValue(titles[sessionId] ?? currentTitle);
  }

  async function commitRename(sessionId: string) {
    const trimmed = renameValue.trim();
    if (trimmed) {
      await saveTitles({ ...titles, [sessionId]: trimmed });
    }
    setRenamingId(null);
  }

  function getTitle(session: { sessionId: string; title: string }) {
    return titles[session.sessionId] ?? session.title;
  }

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : -DRAWER_WIDTH,
      useNativeDriver: true,
      damping: 20,
      stiffness: 180,
    }).start();
  }, [visible]);

  function getInitials(u: AuthUser) {
    if (u.displayName) return u.displayName.slice(0, 2).toUpperCase();
    return u.email.slice(0, 2).toUpperCase();
  }

  function getDisplayName(u: AuthUser) {
    if (u.isGuest) return 'Tamu';
    return u.displayName ?? u.email.split('@')[0];
  }

  function getSubtitle(u: AuthUser) {
    if (u.isGuest) return 'Belum login';
    return u.email;
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Pressable style={s.backdrop} onPress={onClose} />

      {/* Drawer */}
      <Animated.View style={[s.drawer, { transform: [{ translateX: slideAnim }] }]}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.logo}>
            Tanya<Text style={{ color: d.accent }}>.</Text>
          </Text>
          <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={s.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* New chat */}
        <View style={s.section}>
          <TouchableOpacity style={s.newChatBtn} onPress={onNewChat} activeOpacity={0.8}>
            <Text style={s.newChatIcon}>✏️</Text>
            <Text style={s.newChatText}>Pertanyaan baru</Text>
          </TouchableOpacity>
        </View>

        {/* Recents */}
        <ScrollView style={s.recents} showsVerticalScrollIndicator={false}>
          {sessions.length > 0 ? (
            <>
              <Text style={s.sectionLabel}>Terbaru</Text>
              {sessions.map((session) => {
                const isActive = session.sessionId === currentSessionId;
                const isRenaming = renamingId === session.sessionId;
                return (
                  <View key={session.sessionId} style={[s.recentItem, isActive && s.recentItemActive]}>
                    {isRenaming ? (
                      <TextInput
                        style={s.renameInput}
                        value={renameValue}
                        onChangeText={setRenameValue}
                        onSubmitEditing={() => commitRename(session.sessionId)}
                        onBlur={() => commitRename(session.sessionId)}
                        autoFocus
                        returnKeyType="done"
                        selectTextOnFocus
                      />
                    ) : (
                      <TouchableOpacity
                        style={s.recentTextBtn}
                        onPress={() => onSessionSelect(session.sessionId)}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.recentText, isActive && s.recentTextActive]} numberOfLines={1}>
                          {getTitle(session)}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {!isRenaming && (
                      <TouchableOpacity
                        style={s.moreBtn}
                        activeOpacity={0.7}
                        hitSlop={8}
                        onPress={() => startRename(session.sessionId, session.title)}
                      >
                        <Text style={s.moreIcon}>•••</Text>
                      </TouchableOpacity>
                    )}
                    {isRenaming && (
                      <TouchableOpacity
                        style={s.moreBtn}
                        activeOpacity={0.7}
                        hitSlop={8}
                        onPress={() => commitRename(session.sessionId)}
                      >
                        <Text style={[s.moreIcon, { color: d.accent }]}>✓</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </>
          ) : (
            <Text style={s.emptyRecents}>Belum ada sesi percakapan.</Text>
          )}
        </ScrollView>

        {/* Profile / Login */}
        {user && (
          user.isGuest ? (
            <TouchableOpacity
              style={s.loginRow}
              activeOpacity={0.85}
              onPress={() => { onClose(); onLoginPress(); }}
            >
              <Text style={s.loginIcon}>→</Text>
              <Text style={s.loginText}>Masuk / Daftar</Text>
            </TouchableOpacity>
          ) : (
            <>
              {profileOpen && (
                <View style={s.popover}>
                  <View style={s.popoverUser}>
                    <View style={s.avatarSm}>
                      <Text style={s.avatarTextSm}>{getInitials(user)}</Text>
                    </View>
                    <View style={s.popoverUserInfo}>
                      <Text style={s.popoverName} numberOfLines={1}>{getDisplayName(user)}</Text>
                      <Text style={s.popoverSub} numberOfLines={1}>{getSubtitle(user)}</Text>
                    </View>
                  </View>
                  <View style={s.popoverDivider} />
                  <TouchableOpacity
                    style={s.popoverItem}
                    activeOpacity={0.7}
                    onPress={() => { setProfileOpen(false); onClose(); onLogout(); }}
                  >
                    <Text style={s.popoverItemIcon}>→</Text>
                    <Text style={s.popoverItemText}>Keluar</Text>
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity
                style={s.profile}
                activeOpacity={0.8}
                onPress={() => setProfileOpen((v) => !v)}
              >
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{getInitials(user)}</Text>
                </View>
                <View style={s.profileInfo}>
                  <Text style={s.profileName} numberOfLines={1}>{getDisplayName(user)}</Text>
                  <Text style={s.profileSub} numberOfLines={1}>{getSubtitle(user)}</Text>
                </View>
                <Text style={s.profileChevron}>{profileOpen ? '▾' : '▸'}</Text>
              </TouchableOpacity>
            </>
          )
        )}
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: d.bg,
    paddingTop: 16,
    paddingBottom: 0,
    flexDirection: 'column',
  },

  // header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  logo: {
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '600',
    color: d.text,
    letterSpacing: -0.5,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 16,
    color: d.muted,
  },

  // new chat
  section: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: d.newChatBg,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  newChatIcon: {
    fontSize: 16,
  },
  newChatText: {
    fontSize: 15,
    fontWeight: '600',
    color: d.text,
  },

  // recents
  recents: {
    flex: 1,
    paddingHorizontal: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: d.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 8,
    marginTop: 12,
    marginBottom: 6,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 8,
  },
  recentTextBtn: {
    flex: 1,
  },
  renameInput: {
    flex: 1,
    fontSize: 14.5,
    color: d.text,
    backgroundColor: d.surface,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: d.accent,
  },
  recentItemActive: {
    backgroundColor: d.surface,
    borderRadius: 10,
  },
  recentText: {
    flex: 1,
    fontSize: 14.5,
    color: d.text,
    lineHeight: 20,
  },
  recentTextActive: {
    color: d.accent,
    fontWeight: '600',
  },
  moreBtn: {
    paddingHorizontal: 4,
  },
  moreIcon: {
    fontSize: 11,
    color: d.muted,
    letterSpacing: 1,
  },
  emptyRecents: {
    fontSize: 13,
    color: d.muted,
    paddingHorizontal: 8,
    marginTop: 12,
  },

  // profile
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: d.border,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0e9f6e',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '600',
    color: d.text,
  },
  profileSub: {
    fontSize: 12,
    color: d.muted,
    marginTop: 1,
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: d.border,
    backgroundColor: d.surface,
  },
  loginIcon: {
    fontSize: 16,
    color: d.accent,
    fontWeight: '700',
  },
  loginText: {
    fontSize: 15,
    fontWeight: '600',
    color: d.accent,
  },
  profileChevron: {
    fontSize: 12,
    color: d.muted,
  },

  // profile popover
  popover: {
    marginHorizontal: 12,
    marginBottom: 6,
    backgroundColor: d.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: d.border,
    overflow: 'hidden',
  },
  popoverUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  avatarSm: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: d.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextSm: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  popoverUserInfo: {
    flex: 1,
  },
  popoverName: {
    fontSize: 13,
    fontWeight: '600',
    color: d.text,
  },
  popoverSub: {
    fontSize: 11,
    color: d.muted,
    marginTop: 1,
  },
  popoverDivider: {
    height: 1,
    backgroundColor: d.border,
    marginHorizontal: 14,
  },
  popoverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  popoverItemIcon: {
    fontSize: 14,
    color: d.muted,
    width: 18,
    textAlign: 'center',
  },
  popoverItemText: {
    fontSize: 14,
    color: d.text,
    fontWeight: '500',
  },
});
