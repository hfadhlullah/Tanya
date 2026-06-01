import { ActivityIndicator, Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../../theme/ui-reference';
import { BrandText } from './BrandText';

type PrimaryButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  style?: StyleProp<ViewStyle>;
  loading?: boolean;
};

export function PrimaryButton({ label, style, loading, disabled, ...props }: PrimaryButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {loading
        ? <ActivityIndicator color={colors.white} />
        : <BrandText style={styles.label}>{label}</BrandText>
      }
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.emerald,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 22,
    minHeight: 52,
  },
  pressed: { backgroundColor: colors.emeraldDark },
  disabled: { opacity: 0.55 },
  label: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
