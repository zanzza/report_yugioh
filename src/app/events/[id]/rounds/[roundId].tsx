import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert } from 'react-native';

import { roundToDraft } from '@/db/mappers';
import { deleteRound, updateRound } from '@/db/rounds.repo';
import { useRound } from '@/hooks/use-data';
import { EmptyState } from '@/ui/components/primitives';
import { RoundForm } from '@/ui/forms/round-form';

export default function EditRoundScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { roundId } = useLocalSearchParams<{ roundId: string }>();
  const id = Number(roundId);

  const { data: round, loading } = useRound(Number.isFinite(id) ? id : null);

  if (loading) return null;
  if (!round) return <EmptyState title="Ronde introuvable" />;

  const confirmDelete = () => {
    Alert.alert(
      `Supprimer la ronde ${round.roundNumber} ?`,
      'Les rondes suivantes seront renumérotées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteRound(db, round.id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <RoundForm
      initial={roundToDraft(round)}
      submitLabel="Enregistrer"
      onSubmit={async (draft) => {
        await updateRound(db, round.id, draft);
        router.back();
      }}
      onDelete={confirmDelete}
    />
  );
}
