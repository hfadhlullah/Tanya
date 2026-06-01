import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../../theme/ui-reference';
import { BrandText } from './BrandText';

type PrimaryButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({ label, style, ...props }: PrimaryButtonProps) {
  return (
    <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed, style]} {...props}>
      <BrandText style={styles.label}>{label}</BrandText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.emerald800,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  pressed: {
    backgroundColor: colors.emerald900,
  },
  label: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
