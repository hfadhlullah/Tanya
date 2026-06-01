import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../../theme/ui-reference';

interface Props {
  loading: boolean;
  prefill?: string;
  onSubmit: (text: string) => void;
  onPrefillConsumed: () => void;
  guestBlocked?: boolean;
}

export function BottomInputBar({ loading, prefill, onSubmit, onPrefillConsumed, guestBlocked }: Props) {
  const [text, setText] = useState('');

  if (prefill && text !== prefill) {
    setText(prefill);
    onPrefillConsumed();
  }

  function handleSend() {
    if (guestBlocked) {
      onSubmit(''); // AskScreen will intercept and show login gate
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
        <TouchableOpacity style={s.blockedBanner} onPress={handleSend} activeOpacity={0.85}>
          <Text style={s.blockedIcon}>🔒</Text>
          <View style={s.blockedText}>
            <Text style={s.blockedTitle}>Daftar untuk lanjut bertanya</Text>
            <Text style={s.blockedSub}>Pertanyaan gratis sudah digunakan. Buat akun untuk terus bertanya.</Text>
          </View>
          <Text style={s.blockedCta}>Daftar</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.container}>
        <View style={s.pill}>
          <TextInput
            style={s.input}
            placeholder="Tanya apa saja..."
            placeholderTextColor={colors.muted}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
            editable={!loading}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[s.sendBtn, canSend && s.sendBtnActive]}
            onPress={handleSend}
            disabled={!canSend}
            activeOpacity={0.85}
          >
            <Ionicons
              name="arrow-up-outline"
              size={18}
              color={canSend ? colors.white : colors.muted}
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 8 : 12,
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.white,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.ink,
    maxHeight: 120,
    paddingVertical: 8,
    lineHeight: 22,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.line,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  sendBtnActive: { backgroundColor: colors.emerald },

  // guest blocked state
  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.emeraldSoft,
    borderTopWidth: 1,
    borderTopColor: colors.emerald,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: Platform.OS === 'ios' ? 20 : 14,
  },
  blockedIcon: { fontSize: 20 },
  blockedText: { flex: 1 },
  blockedTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  blockedSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  blockedCta: {
    fontSize: 13, fontWeight: '700', color: colors.emeraldDark,
    backgroundColor: colors.white,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 99,
    overflow: 'hidden',
  },
});
