import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PRIMARY_SCORES, SECONDARY_SCORES } from '@/logic/constants';
import type { DeckUsage } from '@/logic/decks';
import { fontSize, radius, spacing, TOUCH_TARGET, TOUCH_TARGET_LARGE, useTheme } from '../theme';

/**
 * Contrôles de l'écran de saisie de ronde : l'écran critique de l'app.
 *
 * Objectif de conception : enregistrer une ronde en quatre appuis et sans
 * ouvrir le clavier, debout entre deux matchs. D'où les grosses tuiles, les
 * zones tactiles de 56 px et les suggestions de decks en chips.
 */

export function DiceToggle({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (value: boolean | null) => void;
}) {
  const colors = useTheme();

  const option = (optionValue: boolean, label: string) => {
    const selected = value === optionValue;
    return (
      <Pressable
        key={label}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={() => onChange(optionValue)}
        style={[
          styles.diceButton,
          {
            backgroundColor: selected ? colors.primary : colors.surface,
            borderColor: selected ? colors.primary : colors.border,
          },
        ]}>
        <Text
          style={[styles.diceLabel, { color: selected ? colors.primaryText : colors.text }]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.diceGroup}>
      <View style={styles.diceRow}>
        {option(true, 'DÉ GAGNÉ')}
        {option(false, 'DÉ PERDU')}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: value === null }}
        onPress={() => onChange(null)}
        style={styles.diceNoneRow}>
        <Text
          style={[
            styles.diceNone,
            { color: value === null ? colors.primary : colors.textMuted },
            value === null && styles.diceNoneActive,
          ]}>
          Bye / pas de lancer
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Grille de scores. Les quatre issues courantes en grosses tuiles, les cas de
 * time (`1-0`, `0-1`, `1-1`) et le brouillon `0-0` sur une ligne discrète.
 */
export function ScoreChips({
  myWins,
  oppWins,
  onChange,
}: {
  myWins: number;
  oppWins: number;
  onChange: (myWins: number, oppWins: number) => void;
}) {
  const colors = useTheme();

  const tile = (mine: number, theirs: number, large: boolean) => {
    const selected = mine === myWins && theirs === oppWins;
    return (
      <Pressable
        key={`${mine}-${theirs}`}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={() => onChange(mine, theirs)}
        style={[
          large ? styles.scoreTile : styles.scoreTileSmall,
          {
            backgroundColor: selected ? colors.primary : colors.surface,
            borderColor: selected ? colors.primary : colors.border,
          },
        ]}>
        <Text
          style={[
            large ? styles.scoreLabel : styles.scoreLabelSmall,
            { color: selected ? colors.primaryText : colors.text },
          ]}>
          {mine}-{theirs}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.scoreGroup}>
      <View style={styles.scoreRow}>
        {PRIMARY_SCORES.map(([mine, theirs]) => tile(mine, theirs, true))}
      </View>
      <View style={styles.scoreRow}>
        {SECONDARY_SCORES.map(([mine, theirs]) => tile(mine, theirs, false))}
      </View>
    </View>
  );
}

/**
 * Saisie d'un nom de deck : les decks déjà rencontrés en chips (un appui
 * suffit), le champ texte ne servant qu'aux nouveaux noms — et il filtre les
 * chips à la frappe.
 */
export function DeckPicker({
  label,
  value,
  onChange,
  suggestions,
  placeholder = 'Nom du deck',
  limit = 8,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: readonly DeckUsage[];
  placeholder?: string;
  limit?: number;
}) {
  const colors = useTheme();
  const visible = suggestions.slice(0, limit);

  return (
    <View style={styles.deckGroup}>
      <Text style={[styles.deckLabel, { color: colors.textMuted }]}>{label}</Text>

      {visible.length > 0 ? (
        <View style={styles.deckChips}>
          {visible.map((suggestion) => {
            const selected = suggestion.label === value;
            return (
              <Pressable
                key={suggestion.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onChange(selected ? '' : suggestion.label)}
                style={[
                  styles.deckChip,
                  {
                    backgroundColor: selected ? colors.primary : colors.surface,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}>
                <Text
                  style={{
                    color: selected ? colors.primaryText : colors.text,
                    fontSize: fontSize.small,
                    fontWeight: '500',
                  }}>
                  {suggestion.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        style={[
          styles.deckInput,
          { backgroundColor: colors.surfaceRaised, borderColor: colors.border, color: colors.text },
        ]}
      />
    </View>
  );
}

/** Petit incrémenteur, pour rattraper un décalage de numéro de ronde. */
export function Stepper({
  value,
  onChange,
  min = 1,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
}) {
  const colors = useTheme();

  const button = (delta: number, label: string, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onChange(value + delta)}
      style={[
        styles.stepperButton,
        { borderColor: colors.border, backgroundColor: colors.surface, opacity: disabled ? 0.4 : 1 },
      ]}>
      <Text style={[styles.stepperLabel, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.stepper}>
      {button(-1, '−', value <= min)}
      <Text style={[styles.stepperValue, { color: colors.text }]}>{value}</Text>
      {button(1, '+', false)}
    </View>
  );
}

const styles = StyleSheet.create({
  diceGroup: {
    gap: spacing.sm,
  },
  diceRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  diceButton: {
    flex: 1,
    minHeight: TOUCH_TARGET_LARGE,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diceLabel: {
    fontSize: fontSize.body,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  diceNoneRow: {
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  diceNone: {
    fontSize: fontSize.small,
  },
  diceNoneActive: {
    fontWeight: '700',
  },
  scoreGroup: {
    gap: spacing.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scoreTile: {
    flex: 1,
    minHeight: TOUCH_TARGET_LARGE,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreTileSmall: {
    flex: 1,
    minHeight: 38,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreLabel: {
    fontSize: fontSize.title,
    fontWeight: '700',
  },
  scoreLabelSmall: {
    fontSize: fontSize.small,
    fontWeight: '600',
  },
  deckGroup: {
    gap: spacing.sm,
  },
  deckLabel: {
    fontSize: fontSize.small,
    fontWeight: '600',
  },
  deckChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  deckChip: {
    minHeight: 38,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
  deckInput: {
    minHeight: TOUCH_TARGET,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.body,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperLabel: {
    fontSize: fontSize.subtitle,
    fontWeight: '700',
  },
  stepperValue: {
    fontSize: fontSize.subtitle,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'center',
  },
});
