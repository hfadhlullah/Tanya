import { StyleSheet, View } from 'react-native';
import { BrandText } from '../atoms/BrandText';
import { colors } from '../../theme/ui-reference';

export function TrustPill() {
  return (
    <View style={styles.pill}>
      <BrandText variant="caption" style={styles.text}>
        Quran & Sunnah, ditinjau ustadz
      </BrandText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.emerald100,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  text: {
    color: colors.emerald900,
    fontWeight: '700',
  },
});
