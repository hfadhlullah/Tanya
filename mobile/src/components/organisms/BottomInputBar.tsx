import { useState } from 'react';
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
}

export function BottomInputBar({ loading, prefill, onSubmit, onPrefillConsumed }: Props) {
  const [text, setText] = useState('');

  // apply prefill when it arrives
  if (prefill && text !== prefill) {
    setText(prefill);
    onPrefillConsumed();
  }

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    onSubmit(trimmed);
    setText('');
  }

  const canSend = !!text.trim() && !loading;

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
            <Text style={[s.sendIcon, canSend && s.sendIconActive]}>↑</Text>
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendBtnActive: {
    backgroundColor: colors.emerald,
  },
  sendIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.muted,
  },
  sendIconActive: {
    color: colors.white,
  },
});
