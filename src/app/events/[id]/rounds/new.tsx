import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { insertRound } from '@/db/rounds.repo';
import { useNextRoundNumber } from '@/hooks/use-data';
import { RoundForm, emptyRoundDraft } from '@/ui/forms/round-form';

export default function NewRoundScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = Number(id);

  const { data: nextNumber, loading } = useNextRoundNumber(
    Number.isFinite(eventId) ? eventId : null
  );

  // On attend le numéro de ronde plutôt que d'afficher « Ronde 1 » puis de le
  // corriger sous les doigts.
  if (loading || nextNumber === undefined) return null;

  return (
    <RoundForm
      initial={emptyRoundDraft(nextNumber)}
      submitLabel="Enregistrer"
      onSubmit={async (draft) => {
        await insertRound(db, eventId, draft);
        router.back();
      }}
      onSubmitNext={async (draft) => {
        await insertRound(db, eventId, draft);
      }}
    />
  );
}
