import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatDateFr } from '@/logic/format';
import { isValidIsoDate } from '@/logic/validation';
import { fontSize, radius, spacing, TOUCH_TARGET, useTheme } from '../theme';

/**
 * Champ date. La valeur d'autorité est la chaîne ISO `AAAA-MM-JJ`, celle-là
 * même qui est stockée : le sélecteur natif n'est qu'un confort de saisie, et
 * le champ texte reste modifiable si le sélecteur pose problème.
 */

/** Date ISO d'aujourd'hui, en heure locale (pas d'UTC : le jour serait décalé). */
export function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function isoToDate(iso: string): Date {
  if (!isValidIsoDate(iso)) return new Date();
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dateToIso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function DateField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  error?: string;
}) {
  const colors = useTheme();
  const [picking, setPicking] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>

      <View style={styles.row}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="AAAA-MM-JJ"
          placeholderTextColor={colors.textFaint}
          keyboardType="numbers-and-punctuation"
          style={[
            styles.input,
            {
              backgroundColor: colors.surfaceRaised,
              borderColor: error ? colors.danger : colors.border,
              color: colors.text,
            },
          ]}
        />
        <Pressable
          accessibilityLabel="Choisir la date dans un calendrier"
          accessibilityRole="button"
          onPress={() => setPicking(true)}
          style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.pickerIcon}>📅</Text>
        </Pressable>
      </View>

      {isValidIsoDate(value) ? (
        <Text style={[styles.preview, { color: colors.textFaint }]}>{formatDateFr(value)}</Text>
      ) : null}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      {picking ? (
        <DateTimePicker
          value={isoToDate(value)}
          mode="date"
          onChange={(event, selected) => {
            setPicking(false);
            if (event.type === 'set' && selected) onChange(dateToIso(selected));
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.small,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: TOUCH_TARGET,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.body,
  },
  pickerButton: {
    width: TOUCH_TARGET,
    minHeight: TOUCH_TARGET,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerIcon: {
    fontSize: fontSize.subtitle,
  },
  preview: {
    fontSize: fontSize.small,
  },
  error: {
    fontSize: fontSize.small,
  },
});
