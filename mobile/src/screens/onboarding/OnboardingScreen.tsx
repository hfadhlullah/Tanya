import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { colors } from '../../theme/ui-reference';

type Level = 'new' | 'returning' | 'practicing';
type FlowIcon = 'search' | 'book' | 'check';

interface Props {
  onComplete: (level: Level) => void;
}

const CHOICES: { icon: 'leaf-outline' | 'refresh-outline' | 'flower-outline'; label: string; sub: string; value: Level }[] = [
  { icon: 'leaf-outline', label: 'Baru kenal Islam', sub: 'Mulai dari nol, tidak apa-apa', value: 'new' },
  { icon: 'refresh-outline', label: 'Lagi kembali lagi', sub: 'Pelan-pelan menata', value: 'returning' },
  { icon: 'flower-outline', label: 'Sudah menjalankan', sub: 'Mau makin dalam', value: 'practicing' },
];

export function OnboardingScreen({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Level>('new');

  function next() {
    if (step < 2) setStep(step + 1);
    else onComplete(selected);
  }

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <Text style={s.logo}>
          Tanya<Text style={s.logoAccent}>.</Text>
        </Text>

        {/* Step content */}
        {step === 0 && <Step0 />}
        {step === 1 && <Step1 />}
        {step === 2 && <Step2 selected={selected} onSelect={setSelected} />}

        <View style={s.spacer} />

        {/* Dots */}
        <View style={s.dots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[s.dot, i === step && s.dotActive]} />
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity style={s.btn} onPress={next} activeOpacity={0.85}>
          <Text style={s.btnText}>
            {step === 0 ? 'Mulai sekarang' : step === 1 ? 'Oke, paham' : 'Mulai bertanya'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Step0() {
  return (
    <View style={s.stepContent}>
      <View style={s.spacer} />
      <Text style={s.h}>
        Mau tanya soal{'\n'}Islam?{' '}
        <Text style={s.hAccent}>Sini.</Text>
      </Text>
      <Text style={s.p}>
        Tanya apa saja, sebebasnya. Jawabannya dicek ustadz sungguhan — lengkap dengan dalilnya,
        biar kamu tenang.
      </Text>
    </View>
  );
}

function Step1() {
  return (
    <View style={s.stepContent}>
      <Text style={[s.h, { fontSize: 21 }]}>
        Tiap jawaban{'\n'}lewat <Text style={s.hAccent}>3 tahap ini</Text>
      </Text>
      <View style={s.trustCard}>
        <FlowRow icon="search" label="Kamu " bold="tanya" tail=" pakai bahasa sendiri" />
        <View style={s.flowLine} />
        <FlowRow icon="book" label="Diambil dari " bold="Qur'an & Sunnah" tail="" />
        <View style={s.flowLine} />
        <FlowRow
          icon="check"
          label=""
          bold="Ustadz"
          tail=" memeriksa dulu  "
          badge="Terverifikasi"
        />
      </View>
      <Text style={[s.p, { fontSize: 13 }]}>
        Bukan grup WA. Bukan tebak-tebakan. Bukan fatwa anonim.
      </Text>
    </View>
  );
}

function FlowRow({
  icon,
  label,
  bold,
  tail,
  badge,
}: {
  icon: FlowIcon;
  label: string;
  bold: string;
  tail: string;
  badge?: string;
}) {
  const icons: Record<FlowIcon, 'search-outline' | 'book-outline' | 'checkmark-circle'> = {
    search: 'search-outline',
    book: 'book-outline',
    check: 'checkmark-circle',
  };
  return (
    <View style={s.flowRow}>
      <View style={s.flowIcon}>
        <Ionicons name={icons[icon]} size={18} color={colors.emeraldDark} />
      </View>
      <Text style={s.flowText}>
        {label}
        <Text style={{ fontWeight: '700' }}>{bold}</Text>
        {tail}
        {badge ? <Text style={s.vbadge}>{badge}</Text> : null}
      </Text>
    </View>
  );
}

function Step2({
  selected,
  onSelect,
}: {
  selected: Level;
  onSelect: (v: Level) => void;
}) {
  return (
    <View style={s.stepContent}>
      <Text style={[s.h, { fontSize: 22 }]}>
        Lagi di tahap{'\n'}mana <Text style={s.hAccent}>sekarang?</Text>
      </Text>
      <Text style={[s.p, { marginBottom: 18, fontSize: 13 }]}>
        Biar jawabannya pas sama kamu. Tenang, ini privat.
      </Text>
      {CHOICES.map((c) => (
        <TouchableOpacity
          key={c.value}
          style={[s.choice, selected === c.value && s.choiceSelected]}
          onPress={() => onSelect(c.value)}
          activeOpacity={0.85}
        >
          <View style={s.choiceIcon}>
            <Ionicons name={c.icon} size={20} color={colors.emeraldDark} />
          </View>
          <View>
            <Text style={s.choiceLabel}>{c.label}</Text>
            <Text style={s.choiceSub}>{c.sub}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 26,
    paddingTop: 30,
    paddingBottom: 20,
  },
  logo: {
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.5,
    color: colors.ink,
  },
  logoAccent: {
    color: colors.emerald,
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  stepContent: {
    flex: 1,
  },
  h: {
    fontFamily: 'serif',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '500',
    letterSpacing: -0.4,
    marginBottom: 12,
    color: colors.ink,
  },
  hAccent: {
    color: colors.emeraldDark,
    fontStyle: 'normal',
  },
  p: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
  },

  // trust card
  trustCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    padding: 20,
    marginTop: 6,
    marginBottom: 22,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 11,
  },
  flowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.emeraldTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.ink,
    flex: 1,
  },
  flowLine: {
    height: 14,
    width: 1,
    backgroundColor: colors.line,
    marginLeft: 18,
  },
  vbadge: {
    backgroundColor: colors.emeraldSoft,
    color: colors.emeraldDark,
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },

  // choices
  choice: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 15,
    padding: 16,
    marginBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  choiceSelected: {
    borderColor: colors.emerald,
    backgroundColor: colors.emeraldTint,
  },
  choiceIcon: {
    width: 28,
    alignItems: 'center',
  },
  choiceLabel: {
    fontSize: 14.5,
    fontWeight: '600',
    color: colors.ink,
  },
  choiceSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },

  // dots
  dots: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.line,
  },
  dotActive: {
    backgroundColor: colors.emerald,
    width: 18,
    borderRadius: 4,
  },

  // button
  btn: {
    backgroundColor: colors.emerald,
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
  },
  btnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'System',
  },
});
