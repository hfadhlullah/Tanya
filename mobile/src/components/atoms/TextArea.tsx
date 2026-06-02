import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { colors } from '../../theme/ui-reference';

export function TextArea(props: TextInputProps) {
  return (
    <TextInput
      multiline
      placeholderTextColor={colors.muted}
      style={[styles.input, props.style]}
      textAlignVertical="top"
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 1.5,
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 14,
    outlineStyle: 'none' as any,
  },
});
