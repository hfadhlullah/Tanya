import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getUstadzDashboard, type UstadzProfile, type UstadzStats } from '../../api/ustadz';
import { logout } from '../../api/auth';
import { PrimaryButton } from '../../components/atoms/PrimaryButton';
import { colors } from '../../theme/ui-reference';

interface Props {
  onOpenQueue: () => void;
  onTryAsk: () => void;
  onLogout: () => void;
}

export function UstadzDashboardScreen({ onOpenQueue, onTryAsk, onLogout }: Props) {
  const [profile, setProfile] = useState<UstadzProfile | null>(null);
  const [stats, setStats] = useState<UstadzStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await getUstadzDashboard();
      setProfile(data.profile);
      setStats(data.stats);
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
    return <View style={s.center}><ActivityIndicator color={colors.emerald} /></View>;
  }

  if (error) {
    return <View style={s.center}><Text style={s.errorText}>{error}</Text></View>;
  }

  return (
    <SafeAreaView style={s.safeArea}>
      <StatusBar style="dark" />
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.greeting}>Assalamu'alaikum</Text>
          <Text style={s.name}>{profile?.publicName}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
          <Text style={s.logoutText}>Keluar</Text>
        </TouchableOpacity>
      </View>

      {/* Status badge */}
      <View style={s.statusRow}>
        <View style={[s.badge, profile?.status === 'APPROVED' ? s.badgeOk : s.badgePending]}>
          <Text style={[s.badgeText, profile?.status === 'APPROVED' ? s.badgeOkText : s.badgePendingText]}>
            {profile?.status === 'APPROVED' ? '● Aktif' : '○ Menunggu Persetujuan'}
          </Text>
        </View>
      </View>

      {/* Stats grid */}
      {stats && (
        <View style={s.statsGrid}>
          <View style={s.statCard}>
            <Text style={s.statNum}>{stats.totalVerified}</Text>
            <Text style={s.statLabel}>Total Diverifikasi</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statNum, { color: colors.emerald }]}>{stats.verifiedToday}</Text>
            <Text style={s.statLabel}>Hari Ini</Text>
          </View>
          <View style={[s.statCard, stats.queueCount > 0 && s.statCardAlert]}>
            <Text style={[s.statNum, stats.queueCount > 0 && { color: '#b45309' }]}>{stats.queueCount}</Text>
            <Text style={s.statLabel}>Antrian</Text>
          </View>
        </View>
      )}

      {/* Profile info */}
      {profile?.specialties?.length ? (
        <View style={s.section}>
          <Text style={s.sectionLabel}>Bidang Keahlian</Text>
          <View style={s.chips}>
            {profile.specialties.map((sp) => (
              <View key={sp} style={s.chip}>
                <Text style={s.chipText}>{sp}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {profile?.madhhab ? (
        <View style={s.section}>
          <Text style={s.sectionLabel}>Madzhab</Text>
          <Text style={s.sectionValue}>{profile.madhhab}</Text>
        </View>
      ) : null}

      {/* Actions */}
      <View style={s.actions}>
        <PrimaryButton label="Tinjau Antrian Jawaban" onPress={onOpenQueue} />
        <TouchableOpacity style={s.tryAskBtn} onPress={onTryAsk} activeOpacity={0.8}>
          <Text style={s.tryAskText}>Coba Tanya sebagai Pengguna</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  errorText: { fontSize: 13, color: colors.muted },
  safeArea: { flex: 1, backgroundColor: colors.paper },
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 24, paddingBottom: 48 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 },
  name: { fontSize: 16, color: colors.muted, marginTop: 2 },
  logoutBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  logoutText: { fontSize: 13, color: colors.muted },

  statusRow: { marginBottom: 24 },
  badge: { alignSelf: 'flex-start', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5 },
  badgeOk: { backgroundColor: colors.emeraldSoft },
  badgePending: { backgroundColor: '#fef9c3' },
  badgeText: { fontSize: 13, fontWeight: '600' },
  badgeOkText: { color: colors.emeraldDark },
  badgePendingText: { color: '#92400e' },

  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 4,
  },
  statCardAlert: { borderColor: '#fed7aa', backgroundColor: '#fffbf5' },
  statNum: { fontSize: 26, fontWeight: '800', color: colors.ink, lineHeight: 30 },
  statLabel: { fontSize: 11, color: colors.muted, textAlign: 'center' },

  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  sectionValue: { fontSize: 16, color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colors.emeraldSoft, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5 },
  chipText: { fontSize: 13, color: colors.emeraldDark, fontWeight: '600' },

  actions: { marginTop: 8, gap: 12 },
  tryAskBtn: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.paper,
  },
  tryAskText: { fontSize: 15, fontWeight: '600', color: colors.muted },
});
