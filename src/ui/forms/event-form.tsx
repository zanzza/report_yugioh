import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { useDeckSuggestions } from '@/hooks/use-data';
import { EVENT_TYPES, eventTypeLabel } from '@/logic/constants';
import type { EventDraft, EventType } from '@/logic/types';
import { validateEventDraft, type EventField } from '@/logic/validation';
import { DateField, todayIso } from '@/ui/components/date-field';
import { ChipGroup, Collapsible, Field, ToggleRow } from '@/ui/components/form-controls';
import { AppButton, SectionTitle } from '@/ui/components/primitives';
import { DeckPicker } from '@/ui/components/round-inputs';
import { HeaderButton } from '@/ui/header-actions';
import { spacing } from '@/ui/theme';

const TYPE_OPTIONS = EVENT_TYPES.map((type) => ({ value: type, label: eventTypeLabel(type) }));

/** Brouillon d'un nouvel event : trois champs suffisent à le créer. */
export function emptyEventDraft(): EventDraft {
  return {
    name: '',
    type: 'LOCALS',
    date: todayIso(),
    playerCount: null,
    finalResult: null,
    finalStanding: null,
    myDeck: null,
    paidEvent: false,
    paidAccommodation: false,
    paidTransport: false,
    transportName: null,
    notes: null,
  };
}

function toIntOrNull(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : Number.NaN;
}

/**
 * Formulaire d'event, partagé entre création et édition.
 *
 * L'ordre des champs est calé sur une saisie le matin du tournoi : nom, type,
 * date, deck joué. Tout le reste — nombre de joueurs, résultat, frais — se
 * complète après coup et vit dans un bloc replié.
 */
export function EventForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: EventDraft;
  submitLabel: string;
  onSubmit: (draft: EventDraft) => Promise<void>;
}) {
  const { myDecks } = useDeckSuggestions();

  const [draft, setDraft] = useState<EventDraft>(initial);
  const [errors, setErrors] = useState<Partial<Record<EventField, string>>>({});
  const [saving, setSaving] = useState(false);

  // Les champs numériques restent en texte pendant la frappe : « 1 » ne doit
  // pas devenir « 1 » puis « NaN » dès qu'on efface tout.
  const [playerCountText, setPlayerCountText] = useState(
    initial.playerCount === null ? '' : String(initial.playerCount)
  );
  const [standingText, setStandingText] = useState(
    initial.finalStanding === null ? '' : String(initial.finalStanding)
  );

  const patch = (changes: Partial<EventDraft>) =>
    setDraft((previous) => ({ ...previous, ...changes }));

  const submit = async () => {
    const candidate: EventDraft = {
      ...draft,
      playerCount: toIntOrNull(playerCountText),
      finalStanding: toIntOrNull(standingText),
    };

    const result = validateEventDraft(candidate);
    setErrors(result.errors);
    if (!result.ok) return;

    setSaving(true);
    try {
      await onSubmit(candidate);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}>
      <HeaderButton label={saving ? '…' : 'Enregistrer'} onPress={() => void submit()} disabled={saving} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field
          label="Nom de l'event"
          value={draft.name}
          onChangeText={(name) => patch({ name })}
          placeholder="YCS Lyon 2026"
          error={errors.name}
          autoFocus={initial.name === ''}
        />

        <View style={styles.group}>
          <SectionTitle>Type d'event</SectionTitle>
          <ChipGroup
            options={TYPE_OPTIONS}
            selected={[draft.type]}
            onToggle={(type: EventType) => patch({ type })}
          />
        </View>

        <DateField
          label="Date"
          value={draft.date}
          onChange={(date) => patch({ date })}
          error={errors.date}
        />

        <DeckPicker
          label="Deck joué"
          value={draft.myDeck ?? ''}
          onChange={(myDeck) => patch({ myDeck })}
          suggestions={myDecks}
          placeholder="Snake-Eye Fiendsmith"
        />

        <Collapsible title="Détails et frais">
          <Field
            label="Nombre de joueurs"
            value={playerCountText}
            onChangeText={setPlayerCountText}
            placeholder="987"
            keyboardType="number-pad"
            error={errors.playerCount}
          />

          <Field
            label="Résultat final"
            value={draft.finalResult ?? ''}
            onChangeText={(finalResult) => patch({ finalResult })}
            placeholder="Top 64, Day 2, Drop R6…"
          />

          <Field
            label="Classement exact"
            value={standingText}
            onChangeText={setStandingText}
            placeholder="37"
            keyboardType="number-pad"
            error={errors.finalStanding}
          />

          <View style={styles.group}>
            <SectionTitle>Frais</SectionTitle>
            <ToggleRow
              label="Event payé"
              value={draft.paidEvent}
              onValueChange={(paidEvent) => patch({ paidEvent })}
            />
            <ToggleRow
              label="Logement payé"
              value={draft.paidAccommodation}
              onValueChange={(paidAccommodation) => patch({ paidAccommodation })}
            />
            <ToggleRow
              label="Transport payé"
              value={draft.paidTransport}
              onValueChange={(paidTransport) => patch({ paidTransport })}
            />
          </View>

          <Field
            label="Nom du transport"
            value={draft.transportName ?? ''}
            onChangeText={(transportName) => patch({ transportName })}
            placeholder="SNCF TGV 8412"
          />

          <Field
            label="Notes"
            value={draft.notes ?? ''}
            onChangeText={(notes) => patch({ notes })}
            placeholder="À retenir pour la prochaine fois…"
            multiline
          />
        </Collapsible>

        <AppButton
          label={saving ? 'Enregistrement…' : submitLabel}
          onPress={() => void submit()}
          disabled={saving}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.xl,
  },
  group: {
    gap: spacing.sm,
  },
});
