import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../theme/ui-reference';

const SUGGESTIONS = [
  { icon: '🕌', label: 'Salat yang sering ketinggalan', fill: 'Bagaimana cara mengganti salat yang sering ketinggalan?' },
  { icon: '📿', label: 'Hukum puasa sunnah', fill: 'Apa saja aturan dan hukum puasa sunnah?' },
  { icon: '📖', label: 'Dalil soal sedekah', fill: 'Apa dalil tentang keutamaan sedekah?' },
];

interface Props {
  onSelect: (text: string) => void;
}

export function SuggestionChips({ onSelect }: Props) {
  return (
    <View style={s.root}>
      <Text style={s.label}>Mulai dari sini</Text>
      {SUGGESTIONS.map((item) => (
        <TouchableOpacity key={item.label} style={s.chip} onPress={() => onSelect(item.fill)} activeOpacity={0.7}>
          <Text style={s.icon}>{item.icon}</Text>
          <Text style={s.text}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
  },
  label: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  icon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  text: {
    fontSize: 15,
    color: colors.ink,
    fontWeight: '500',
  },
});
