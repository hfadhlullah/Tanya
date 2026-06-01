import { StyleSheet, Text, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../../theme/ui-reference';

interface Props {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  color?: string;
}

export function TextButton({ label, onPress, style, color = colors.muted }: Props) {
  return (
    <TouchableOpacity style={[s.btn, style]} onPress={onPress} activeOpacity={0.7} hitSlop={8}>
      <Text style={[s.label, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: { alignItems: 'center', paddingVertical: 10 },
  label: { fontSize: 15, fontWeight: '500' },
});
