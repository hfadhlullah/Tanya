import { Text, type TextProps, StyleSheet } from 'react-native';
import { colors } from '../../theme/ui-reference';

type BrandTextProps = TextProps & {
  variant?: 'title' | 'body' | 'caption';
};

export function BrandText({ variant = 'body', style, ...props }: BrandTextProps) {
  return <Text style={[styles.base, styles[variant], style]} {...props} />;
}

const styles = StyleSheet.create({
  base: {
    color: colors.ink900,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 36,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  caption: {
    color: colors.ink600,
    fontSize: 13,
    lineHeight: 18,
  },
});
