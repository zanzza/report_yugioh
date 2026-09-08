import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';

import { fontSize, radius, spacing, TOUCH_TARGET, useTheme } from '../theme';

/** Champ texte avec libellé et message d'erreur sous le champ. */
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType,
  autoFocus,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
  autoFocus?: boolean;
  multiline?: boolean;
}) {
  const colors = useTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        multiline={multiline}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          {
            backgroundColor: colors.surfaceRaised,
            borderColor: error ? colors.danger : colors.border,
            color: colors.text,
          },
        ]}
      />
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

/** Sélecteur exclusif compact — type d'event, onglets de stats. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const colors = useTheme();

  return (
    <View style={[styles.segmented, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              selected && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}>
            <Text
              numberOfLines={1}
              style={[
                styles.segmentLabel,
                { color: selected ? colors.primaryText : colors.textMuted },
              ]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Chips multi-sélection, pour les filtres de l'écran de stats. */
export function ChipGroup<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: readonly SegmentOption<T>[];
  selected: readonly T[];
  onToggle: (value: T) => void;
}) {
  const colors = useTheme();

  return (
    <View style={styles.chipGroup}>
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onToggle(option.value)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.primary : colors.surface,
                borderColor: active ? colors.primary : colors.border,
              },
            ]}>
            <Text style={{ color: active ? colors.primaryText : colors.text, fontSize: fontSize.small }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Ligne à interrupteur. Sur l'écran de détail, elle écrit immédiatement en
 * base : aucun bouton « Enregistrer » pour les frais.
 */
export function ToggleRow({
  label,
  value,
  onValueChange,
  hint,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  hint?: string;
}) {
  const colors = useTheme();

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      style={styles.toggleRow}>
      <View style={styles.toggleTexts}>
        <Text style={[styles.toggleLabel, { color: colors.text }]}>{label}</Text>
        {hint ? <Text style={[styles.toggleHint, { color: colors.textMuted }]}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.primary, false: colors.track }}
      />
    </Pressable>
  );
}

/** Bloc repliable — les champs secondaires des formulaires. */
export function Collapsible({
  title,
  children,
  initiallyOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  initiallyOpen?: boolean;
}) {
  const colors = useTheme();
  const [open, setOpen] = useState(initiallyOpen);

  return (
    <View style={styles.collapsible}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((previous) => !previous)}
        style={styles.collapsibleHeader}>
        <Text style={[styles.collapsibleTitle, { color: colors.primary }]}>
          {open ? '▾' : '▸'}  {title}
        </Text>
      </Pressable>
      {open ? <View style={styles.collapsibleBody}>{children}</View> : null}
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
  input: {
    minHeight: TOUCH_TARGET,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.body,
  },
  inputMultiline: {
    minHeight: TOUCH_TARGET * 2,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  error: {
    fontSize: fontSize.small,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    minHeight: TOUCH_TARGET - 10,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  segmentLabel: {
    fontSize: fontSize.small,
    fontWeight: '600',
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
  toggleRow: {
    minHeight: TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  toggleTexts: {
    flexShrink: 1,
    gap: 2,
  },
  toggleLabel: {
    fontSize: fontSize.body,
    fontWeight: '500',
  },
  toggleHint: {
    fontSize: fontSize.small,
  },
  collapsible: {
    gap: spacing.md,
  },
  collapsibleHeader: {
    minHeight: TOUCH_TARGET - 8,
    justifyContent: 'center',
  },
  collapsibleTitle: {
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  collapsibleBody: {
    gap: spacing.lg,
  },
});
