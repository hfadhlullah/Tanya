import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { colors } from '../../theme/ui-reference';

export function TextArea(props: TextInputProps) {
  return (
    <TextInput
      multiline
      placeholderTextColor={colors.ink600}
      style={styles.input}
      textAlignVertical="top"
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.sand50,
    borderColor: colors.emerald100,
    borderRadius: 24,
    borderWidth: 1,
    color: colors.ink900,
    fontSize: 17,
    lineHeight: 24,
    minHeight: 132,
    padding: 18,
  },
});
