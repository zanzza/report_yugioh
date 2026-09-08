import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useDeckSuggestions } from '@/hooks/use-data';
import { normalizeDeckKey } from '@/logic/decks';
import type { RoundDraft } from '@/logic/types';
import { validateRoundDraft, type RoundField } from '@/logic/validation';
import { Collapsible, Field } from '@/ui/components/form-controls';
import { AppButton, SectionTitle } from '@/ui/components/primitives';
import { DeckPicker, DiceToggle, ScoreChips, Stepper } from '@/ui/components/round-inputs';
import { fontSize, spacing, useTheme } from '@/ui/theme';

export function emptyRoundDraft(roundNumber: number): RoundDraft {
  return {
    roundNumber,
    diceWon: null,
    myWins: 0,
    oppWins: 0,
    opponentDeck: null,
    comment: null,
  };
}

/**
 * Formulaire de ronde — l'écran critique de l'app.
 *
 * Tout est pensé pour tenir en quatre appuis, sans ouvrir le clavier : dé,
 * score, deck adverse (en chips), puis « Enregistrer + ronde suivante ». Le
 * commentaire est replié pour rester hors du chemin critique.
 */
export function RoundForm({
  initial,
  submitLabel,
  onSubmit,
  onSubmitNext,
  onDelete,
}: {
  initial: RoundDraft;
  submitLabel: string;
  onSubmit: (draft: RoundDraft) => Promise<void>;
  onSubmitNext?: (draft: RoundDraft) => Promise<void>;
  onDelete?: () => void;
}) {
  const colors = useTheme();
  const { opponentDecks } = useDeckSuggestions();

  const [draft, setDraft] = useState<RoundDraft>(initial);
  const [errors, setErrors] = useState<Partial<Record<RoundField, string>>>({});
  const [saving, setSaving] = useState(false);

  const patch = (changes: Partial<RoundDraft>) =>
    setDraft((previous) => ({ ...previous, ...changes }));

  // Le champ texte filtre les chips à la frappe : taper « ryz » réduit la liste
  // au lieu de forcer à écrire le nom en entier.
  const query = normalizeDeckKey(draft.opponentDeck);
  const filteredDecks =
    draft.opponentDeck?.trim()
      ? opponentDecks.filter((deck) => deck.key.includes(query))
      : opponentDecks;

  const run = async (action: (draft: RoundDraft) => Promise<void>, keepGoing: boolean) => {
    const result = validateRoundDraft(draft);
    setErrors(result.errors);
    if (!result.ok) return;

    setSaving(true);
    try {
      await action(draft);
      if (keepGoing) setDraft(emptyRoundDraft(draft.roundNumber + 1));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Ronde {draft.roundNumber}</Text>
        <Stepper
          value={draft.roundNumber}
          onChange={(roundNumber) => patch({ roundNumber })}
        />
      </View>
      {errors.roundNumber ? (
        <Text style={{ color: colors.danger, fontSize: fontSize.small }}>{errors.roundNumber}</Text>
      ) : null}

      <View style={styles.group}>
        <SectionTitle>Lancer de dé</SectionTitle>
        <DiceToggle value={draft.diceWon} onChange={(diceWon) => patch({ diceWon })} />
      </View>

      <View style={styles.group}>
        <SectionTitle>Score</SectionTitle>
        <ScoreChips
          myWins={draft.myWins}
          oppWins={draft.oppWins}
          onChange={(myWins, oppWins) => patch({ myWins, oppWins })}
        />
        {errors.myWins ? (
          <Text style={{ color: colors.danger, fontSize: fontSize.small }}>{errors.myWins}</Text>
        ) : null}
        <Text style={[styles.hint, { color: colors.textFaint }]}>
          Laisse 0-0 pour préparer une ronde : elle sera comptée « en cours » et exclue des stats.
        </Text>
      </View>

      <DeckPicker
        label="Deck adverse"
        value={draft.opponentDeck ?? ''}
        onChange={(opponentDeck) => patch({ opponentDeck })}
        suggestions={filteredDecks}
      />

      <Collapsible title="Commentaire">
        <Field
          label="Ce qu'il faut retenir"
          value={draft.comment ?? ''}
          onChangeText={(comment) => patch({ comment })}
          placeholder="Top parfait en game 3, side raté…"
          multiline
        />
      </Collapsible>

      <View style={styles.actions}>
        <AppButton
          label={saving ? 'Enregistrement…' : submitLabel}
          onPress={() => void run(onSubmit, false)}
          disabled={saving}
        />
        {onSubmitNext ? (
          <AppButton
            label="Enregistrer + ronde suivante"
            variant="secondary"
            onPress={() => void run(onSubmitNext, true)}
            disabled={saving}
          />
        ) : null}
        {onDelete ? (
          <AppButton label="Supprimer la ronde" variant="danger" onPress={onDelete} />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
  },
  group: {
    gap: spacing.sm,
  },
  hint: {
    fontSize: fontSize.caption,
    lineHeight: 16,
  },
  actions: {
    gap: spacing.sm,
  },
});
