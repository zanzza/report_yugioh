import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { insertEvent } from '@/db/events.repo';
import { EventForm, emptyEventDraft } from '@/ui/forms/event-form';

export default function NewEventScreen() {
  const db = useSQLiteContext();
  const router = useRouter();

  return (
    <EventForm
      initial={emptyEventDraft()}
      submitLabel="Créer l'event"
      onSubmit={async (draft) => {
        const id = await insertEvent(db, draft);
        // On remplace l'écran de création : le retour arrière depuis le détail
        // doit ramener à la liste, pas au formulaire.
        router.replace(`/events/${id}`);
      }}
    />
  );
}
