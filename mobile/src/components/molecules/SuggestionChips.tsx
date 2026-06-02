import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '../../theme/ThemeContext';

const SUGGESTIONS = [
  {
    icon: 'time-outline',
    label: 'Salat yang sering ketinggalan',
    fill: 'Bagaimana cara mengganti salat yang sering ketinggalan?',
  },
  {
    icon: 'calendar-outline',
    label: 'Hukum puasa sunnah',
    fill: 'Apa saja aturan dan hukum puasa sunnah?',
  },
  {
    icon: 'book-outline',
    label: 'Dalil soal sedekah',
    fill: 'Apa dalil tentang keutamaan sedekah?',
  },
] as const;

interface Props {
  onSelect: (text: string) => void;
}

export function SuggestionChips({ onSelect }: Props) {
  const c = useColors();
  return (
    <View style={s.root}>
      <Text style={[s.label, { color: c.muted }]}>Mulai dari sini</Text>
      {SUGGESTIONS.map((item) => (
        <TouchableOpacity
          key={item.label}
          style={[s.chip, { backgroundColor: c.white, borderColor: c.line }]}
          onPress={() => onSelect(item.fill)}
          activeOpacity={0.7}
        >
          <View style={s.icon}>
            <Ionicons name={item.icon} size={18} color={c.emeraldDark} />
          </View>
          <Text style={[s.text, { color: c.ink }]}>{item.label}</Text>
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
    borderRadius: 14,
    borderWidth: 1,
  },
  icon: {
    width: 28,
    alignItems: 'center',
  },
  text: {
    fontSize: 15,
    fontWeight: '500',
  },
});
