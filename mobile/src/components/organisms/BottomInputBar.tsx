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
import { useColors } from '../../theme/ThemeContext';

interface Props {
  loading: boolean;
  prefill?: string;
  onSubmit: (text: string) => void;
  onPrefillConsumed: () => void;
  guestBlocked?: boolean;
}

export function BottomInputBar({ loading, prefill, onSubmit, onPrefillConsumed, guestBlocked }: Props) {
  const [text, setText] = useState('');
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
