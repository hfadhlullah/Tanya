import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { colors } from '../../theme/ui-reference';

export function TextField(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      style={styles.input}
      {...props}
    />
  );
}

export const textFieldStyle = StyleSheet.create({
  input: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 15,
    color: colors.ink,
    minHeight: 52,
  },
}).input;

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 15,
    color: colors.ink,
    minHeight: 52,
  },
});
