import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { useColors } from '../../theme/ThemeContext';

interface Props {
  name: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  color?: string;
  size?: number;
}

export function IconButton({ name, onPress, style, color, size = 24 }: Props) {
  const c = useColors();
  return (
    <TouchableOpacity style={[styles.btn, style]} onPress={onPress} activeOpacity={0.7} hitSlop={8}>
      <Ionicons name={name} size={size} color={color ?? c.ink} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
