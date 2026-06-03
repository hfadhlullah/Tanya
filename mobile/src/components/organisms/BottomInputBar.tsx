import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useColors } from '../../theme/ThemeContext';

const MODE_OPTIONS: { value: 'fast' | 'thinking'; label: string }[] = [
  { value: 'fast', label: 'Cepat' },
  { value: 'thinking', label: 'Mendalam' },
];

interface Props {
  loading: boolean;
  prefill?: string;
  onSubmit: (text: string) => void;
  onPrefillConsumed: () => void;
  guestBlocked?: boolean;
  answerMode?: 'fast' | 'thinking';
  onAnswerModeChange?: (mode: 'fast' | 'thinking') => void;
}

export function BottomInputBar({ loading, prefill, onSubmit, onPrefillConsumed, guestBlocked, answerMode, onAnswerModeChange }: Props) {
  const [text, setText] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const c = useColors();

  if (prefill && text !== prefill) {
    setText(prefill);
    onPrefillConsumed();
  }

  function handleSend() {
    if (guestBlocked) {
      onSubmit('');
      return;
    }
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    onSubmit(trimmed);
    setText('');
  }

  const canSend = guestBlocked ? true : (!!text.trim() && !loading);

  if (guestBlocked) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity
          style={[s.blockedBanner, { backgroundColor: c.emeraldSoft, borderTopColor: c.emerald }]}
          onPress={handleSend}
          activeOpacity={0.85}
        >
          <Text style={s.blockedIcon}>🔒</Text>
          <View style={s.blockedText}>
            <Text style={[s.blockedTitle, { color: c.ink }]}>Daftar untuk lanjut bertanya</Text>
            <Text style={[s.blockedSub, { color: c.muted }]}>Pertanyaan gratis sudah digunakan. Buat akun untuk terus bertanya.</Text>
          </View>
          <Text style={[s.blockedCta, { color: c.emeraldDark, backgroundColor: c.white }]}>
            Daftar
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  }

  const currentLabel = MODE_OPTIONS.find((o) => o.value === answerMode)?.label ?? 'Cepat';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[s.container, { backgroundColor: c.paper, borderTopColor: c.line }]}>
        <View style={[s.pill, { backgroundColor: c.white, borderColor: c.line }]}>
          <TextInput
            style={[s.input, { color: c.ink }]}
            placeholder="Tanya apa saja..."
            placeholderTextColor={c.muted}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
            editable={!loading}
            returnKeyType="default"
          />
          {onAnswerModeChange && (
            <TouchableOpacity
              style={[s.modeBtn, { borderColor: c.line }]}
              onPress={() => setMenuVisible(true)}
              activeOpacity={0.75}
            >
              <Text style={[s.modeBtnLabel, { color: c.ink }]}>{currentLabel}</Text>
              <Ionicons name="chevron-down" size={12} color={c.muted} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[s.sendBtn, { backgroundColor: c.line }, canSend && { backgroundColor: c.emerald }]}
            onPress={handleSend}
            disabled={!canSend}
            activeOpacity={0.85}
          >
            <Ionicons
              name="arrow-up-outline"
              size={18}
              color={canSend ? '#fff' : c.muted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {onAnswerModeChange && (
        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
            <View style={s.overlay}>
              <TouchableWithoutFeedback>
                <View style={[s.menu, { backgroundColor: c.paper, borderColor: c.line }]}>
                  {MODE_OPTIONS.map((opt) => {
                    const active = opt.value === answerMode;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[s.menuItem, active && { backgroundColor: c.emeraldTint }]}
                        onPress={() => {
                          onAnswerModeChange(opt.value);
                          setMenuVisible(false);
                        }}
                        activeOpacity={0.75}
                      >
                        <Text style={[s.menuLabel, { color: c.ink }, active && { color: c.emerald, fontWeight: '700' }]}>
                          {opt.label}
                        </Text>
                        {active && <Ionicons name="checkmark" size={16} color={c.emerald} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 8 : 12,
    borderTopWidth: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 26,
    borderWidth: 1.5,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 120,
    paddingVertical: 8,
    lineHeight: 22,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 2,
  },
  modeBtnLabel: { fontSize: 12, fontWeight: '600' },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 90 : 80,
  },
  menu: {
    alignSelf: 'flex-end',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuLabel: { fontSize: 15, fontWeight: '500' },

  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: Platform.OS === 'ios' ? 20 : 14,
  },
  blockedIcon: { fontSize: 20 },
  blockedText: { flex: 1 },
  blockedTitle: { fontSize: 14, fontWeight: '700' },
  blockedSub: { fontSize: 12, marginTop: 2 },
  blockedCta: {
    fontSize: 13, fontWeight: '700',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 99,
    overflow: 'hidden',
  },
});
