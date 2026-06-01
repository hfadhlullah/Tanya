import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../../theme/ui-reference';
import { BrandText } from './BrandText';

type Props = Omit<PressableProps, 'style'> & {
  label: string;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'danger';
};

export function SecondaryButton({ label, style, variant = 'default', ...props }: Props) {
  const isDanger = variant === 'danger';
  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        isDanger ? styles.danger : styles.default,
        pressed && (isDanger ? styles.dangerPressed : styles.defaultPressed),
        style,
      ]}
      {...props}
    >
      <BrandText style={[styles.label, isDanger ? styles.dangerLabel : styles.defaultLabel]}>
        {label}
      </BrandText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderWidth: 1.5,
  },
  default: { borderColor: colors.line, backgroundColor: colors.paper },
  defaultPressed: { backgroundColor: colors.bg },
  defaultLabel: { color: colors.muted },
  danger: { borderColor: '#fecaca', backgroundColor: '#fff7f7' },
  dangerPressed: { backgroundColor: '#fee2e2' },
  dangerLabel: { color: '#ef4444' },
  label: { fontSize: 13, fontWeight: '600' },
});
