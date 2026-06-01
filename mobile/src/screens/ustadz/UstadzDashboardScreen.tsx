import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { getUstadzDashboard, type UstadzProfile } from '../../api/ustadz';
import { logout } from '../../api/auth';
import { BrandText } from '../../components/atoms/BrandText';
import { PrimaryButton } from '../../components/atoms/PrimaryButton';
import { colors } from '../../theme/ui-reference';

type Tab = 'dashboard' | 'queue';

interface Props {
  onOpenQueue: () => void;
  onLogout: () => void;
}

export function UstadzDashboardScreen({ onOpenQueue, onLogout }: Props) {
  const [profile, setProfile] = useState<UstadzProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await getUstadzDashboard();
      setProfile(data.profile);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    onLogout();
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.emerald} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <BrandText variant="caption">{error}</BrandText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <BrandText variant="title">Assalamu'alaikum</BrandText>
          <BrandText variant="body" style={styles.name}>
            {profile?.publicName}
          </BrandText>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <BrandText variant="caption" style={styles.logoutText}>
            Keluar
          </BrandText>
        </TouchableOpacity>
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.badge, profile?.status === 'APPROVED' ? styles.badgeOk : styles.badgePending]}>
          <BrandText variant="caption" style={styles.badgeText}>
            {profile?.status === 'APPROVED' ? 'Aktif' : 'Menunggu Persetujuan'}
          </BrandText>
        </View>
      </View>

      {profile?.specialties?.length ? (
        <View style={styles.section}>
          <BrandText variant="caption" style={styles.sectionLabel}>
            Bidang Keahlian
          </BrandText>
          <View style={styles.chips}>
            {profile.specialties.map((s) => (
              <View key={s} style={styles.chip}>
                <BrandText variant="caption">{s}</BrandText>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {profile?.madhhab ? (
        <View style={styles.section}>
          <BrandText variant="caption" style={styles.sectionLabel}>
            Madzhab
          </BrandText>
          <BrandText variant="body">{profile.madhhab}</BrandText>
        </View>
      ) : null}

      <View style={styles.actions}>
        <PrimaryButton label="Tinjau Antrian Jawaban" onPress={onOpenQueue} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  container: { flex: 1, backgroundColor: colors.paper, padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 16, marginBottom: 20 },
  name: { color: colors.muted, marginTop: 2 },
  logoutBtn: { paddingVertical: 6, paddingHorizontal: 10 },
  logoutText: { color: colors.muted },
  statusRow: { marginBottom: 24 },
  badge: { alignSelf: 'flex-start', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5 },
  badgeOk: { backgroundColor: colors.emeraldSoft },
  badgePending: { backgroundColor: '#fef9c3' },
  badgeText: { fontWeight: '600' },
  section: { marginBottom: 20 },
  sectionLabel: { marginBottom: 6, fontWeight: '600', color: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colors.emeraldSoft, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5 },
  actions: { marginTop: 'auto', paddingTop: 24 },
});
