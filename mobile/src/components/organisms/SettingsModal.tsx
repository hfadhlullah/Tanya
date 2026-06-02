import { useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type AuthUser, updateMe } from '../../api/auth';
import {
  getMyPreferences,
  listPublicUstadz,
  updateMyPreferences,
  type PublicUstadz,
} from '../../api/preferences';
import { useTheme, type ThemePreference, type ResolvedTheme } from '../../theme/ThemeContext';

const BIO_KEY = '@tanya_bio';
const SCREEN_HEIGHT = Dimensions.get('window').height;

const darkD = {
  bg: '#0d1f18',
  surface: '#122d1f',
  border: '#1d3d2a',
  text: '#e8f5ef',
  muted: '#6b9980',
  accent: '#0e9f6e',
  inputBg: '#0a1a13',
};

const lightD = {
  bg: '#f0faf6',
  surface: '#ddf2e8',
  border: '#b4dfc8',
  text: '#0d211a',
  muted: '#3d7a5f',
  accent: '#0e9f6e',
  inputBg: '#ffffff',
};

function getModalColors(resolved: ResolvedTheme) {
  return resolved === 'light' ? lightD : darkD;
}

interface Props {
  visible: boolean;
  user: AuthUser;
  onClose: () => void;
  onUserUpdated: (u: AuthUser) => void;
}

export function SettingsModal({ visible, user, onClose, onUserUpdated }: Props) {
  const { preference, setPreference, resolved } = useTheme();
  const d = useMemo(() => getModalColors(resolved), [resolved]);
  const s = useMemo(() => getStyles(d), [d]);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const [nickname, setNickname] = useState(user.displayName ?? '');
  const [bio, setBio] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [ustadzList, setUstadzList] = useState<PublicUstadz[]>([]);
  const [preferredIds, setPreferredIds] = useState<string[]>([]);
  const [prefLoading, setPrefLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(SCREEN_HEIGHT);
      setNickname(user.displayName ?? '');
      setSearchQuery('');
      loadData();
    }
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : SCREEN_HEIGHT,
      useNativeDriver: true,
      damping: 20,
      stiffness: 180,
    }).start();
  }, [visible]);

  async function loadData() {
    setPrefLoading(true);
    try {
      const [prefs, list, bioRaw] = await Promise.all([
        getMyPreferences(),
        listPublicUstadz(),
        AsyncStorage.getItem(BIO_KEY),
      ]);
      setPreferredIds(prefs.preferredUstadzIds);
      setUstadzList(list);
      setBio(bioRaw ?? '');
    } catch {
      // ignore
    } finally {
      setPrefLoading(false);
    }
  }

  async function saveNickname() {
    const trimmed = nickname.trim();
    if (!trimmed || trimmed === (user.displayName ?? '')) return;
    setNicknameSaving(true);
    try {
      const updated = await updateMe(trimmed);
      onUserUpdated(updated);
    } catch {
      // ignore
    } finally {
      setNicknameSaving(false);
    }
  }

  async function toggleUstadz(id: string) {
    const next = preferredIds.includes(id)
      ? preferredIds.filter((x) => x !== id)
      : [...preferredIds, id];
    setPreferredIds(next);
    updateMyPreferences(next).catch(() => {});
  }

  const filteredUstadz = ustadzList.filter(
    (u) =>
      u.publicName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.specialties.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const themeOptions: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: 'Sistem' },
    { value: 'light', label: 'Terang' },
    { value: 'dark', label: 'Gelap' },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.keyboardWrap}
        pointerEvents="box-none"
      >
        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>Personalisasi</Text>
            <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={d.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={s.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.scrollContent}
          >
            {/* Appearance */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>Tampilan</Text>
              <View style={s.segmented}>
                {themeOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[s.segmentBtn, preference === opt.value && s.segmentBtnActive]}
                    onPress={() => setPreference(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[s.segmentText, preference === opt.value && s.segmentTextActive]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* About you */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>Tentang Saya</Text>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Nama panggilan</Text>
                <View style={s.inputRow}>
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    value={nickname}
                    onChangeText={setNickname}
                    onBlur={saveNickname}
                    placeholder="Masukkan nama panggilan"
                    placeholderTextColor={d.muted}
                    returnKeyType="done"
                  />
                  {nicknameSaving && (
                    <ActivityIndicator size="small" color={d.accent} style={{ marginLeft: 8 }} />
                  )}
                </View>
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Lebih lanjut tentang kamu</Text>
                <TextInput
                  style={[s.input, s.inputMultiline]}
                  value={bio}
                  onChangeText={setBio}
                  onBlur={() => AsyncStorage.setItem(BIO_KEY, bio)}
                  placeholder="Ceritakan sedikit tentang dirimu..."
                  placeholderTextColor={d.muted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Ustadz selection */}
            <View style={[s.section, s.sectionLast]}>
              <Text style={s.sectionLabel}>Ustadz Pilihan</Text>
              <View style={s.searchRow}>
                <Ionicons name="search-outline" size={15} color={d.muted} />
                <TextInput
                  style={s.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Cari ustadz..."
                  placeholderTextColor={d.muted}
                  returnKeyType="search"
                />
              </View>
              {prefLoading ? (
                <ActivityIndicator size="small" color={d.accent} style={{ margin: 16 }} />
              ) : filteredUstadz.length === 0 ? (
                <Text style={s.ustadzEmpty}>
                  {searchQuery ? 'Tidak ditemukan.' : 'Belum ada ustadz tersedia.'}
                </Text>
              ) : (
                filteredUstadz.map((u) => {
                  const selected = preferredIds.includes(u.id);
                  return (
                    <TouchableOpacity
                      key={u.id}
                      style={s.ustadzRow}
                      activeOpacity={0.7}
                      onPress={() => toggleUstadz(u.id)}
                    >
                      <View style={s.ustadzInfo}>
                        <Text style={s.ustadzName}>{u.publicName}</Text>
                        {u.specialties.length > 0 && (
                          <Text style={s.ustadzSpec} numberOfLines={1}>
                            {u.specialties.join(', ')}
                          </Text>
                        )}
                      </View>
                      <Ionicons
                        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={selected ? d.accent : d.muted}
                      />
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function getStyles(d: ReturnType<typeof getModalColors>) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    keyboardWrap: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: d.bg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: SCREEN_HEIGHT * 0.85,
      borderTopWidth: 1,
      borderColor: d.border,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: d.border,
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 4,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: d.border,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: d.text,
      letterSpacing: -0.3,
    },
    closeBtn: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scroll: { flexShrink: 1 },
    scrollContent: { paddingBottom: 24 },

    section: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: d.border,
    },
    sectionLast: { borderBottomWidth: 0 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: d.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 12,
    },

    segmented: {
      flexDirection: 'row',
      backgroundColor: d.surface,
      borderRadius: 10,
      padding: 3,
      marginBottom: 12,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 8,
      alignItems: 'center',
    },
    segmentBtnActive: {
      backgroundColor: d.accent,
    },
    segmentText: {
      fontSize: 13,
      fontWeight: '600',
      color: d.muted,
    },
    segmentTextActive: {
      color: '#fff',
    },

    field: { marginBottom: 12 },
    fieldLabel: {
      fontSize: 12,
      color: d.muted,
      fontWeight: '500',
      marginBottom: 6,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    input: {
      backgroundColor: d.inputBg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: d.border,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 14,
      color: d.text,
    },
    inputMultiline: {
      minHeight: 80,
      paddingTop: 11,
    },

    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: d.inputBg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: d.border,
      paddingHorizontal: 12,
      marginBottom: 8,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 10,
      fontSize: 14,
      color: d.text,
    },
    ustadzEmpty: { fontSize: 13, color: d.muted, paddingVertical: 12 },
    ustadzRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: d.border,
    },
    ustadzInfo: { flex: 1 },
    ustadzName: { fontSize: 14, fontWeight: '600', color: d.text },
    ustadzSpec: { fontSize: 11, color: d.muted, marginTop: 2 },
  });
}
