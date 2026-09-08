import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { useEventWithRounds } from '@/hooks/use-data';
import { generateEventSummary } from '@/logic/summary';
import { SegmentedControl } from '@/ui/components/form-controls';
import { AppButton, EmptyState } from '@/ui/components/primitives';
import { fontSize, radius, spacing, useTheme } from '@/ui/theme';

const MODES = [
  { value: 'full', label: 'Complet' },
  { value: 'compact', label: 'Compact' },
] as const;

type Mode = (typeof MODES)[number]['value'];

export default function SummaryScreen() {
  const colors = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = Number(id);

  const { data, loading } = useEventWithRounds(Number.isFinite(eventId) ? eventId : null);
  const [mode, setMode] = useState<Mode>('full');
  const [copied, setCopied] = useState(false);

  const summary = useMemo(
    () => (data ? generateEventSummary(data, { compact: mode === 'compact' }) : ''),
    [data, mode]
  );

  if (loading) return null;
  if (!data) return <EmptyState title="Event introuvable" />;

  const copy = async () => {
    await Clipboard.setStringAsync(summary);
    setCopied(true);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SegmentedControl
        options={MODES}
        value={mode}
        onChange={(next) => {
          setMode(next);
          setCopied(false);
        }}
      />

      <View
        style={[styles.paper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text selectable style={[styles.text, { color: colors.text }]}>
          {summary}
        </Text>
      </View>

      <View style={styles.actions}>
        <AppButton
          label={copied ? 'Copié ✓' : 'Copier'}
          style={styles.flex}
          onPress={() => void copy()}
        />
        <AppButton
          label="Partager"
          variant="secondary"
          style={styles.flex}
          onPress={() => void Share.share({ message: summary })}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  flex: {
    flex: 1,
  },
  paper: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  text: {
    fontSize: fontSize.small,
    lineHeight: 21,
    fontVariant: ['tabular-nums'],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
