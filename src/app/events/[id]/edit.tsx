import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { updateEvent } from '@/db/events.repo';
import { eventToDraft } from '@/db/mappers';
import { useEvent } from '@/hooks/use-data';
import { EmptyState } from '@/ui/components/primitives';
import { EventForm } from '@/ui/forms/event-form';

export default function EditEventScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = Number(id);

  const { data: event, loading } = useEvent(Number.isFinite(eventId) ? eventId : null);

  if (loading) return null;
  if (!event) return <EmptyState title="Event introuvable" />;

  return (
    <EventForm
      initial={eventToDraft(event)}
      submitLabel="Enregistrer les modifications"
      onSubmit={async (draft) => {
        await updateEvent(db, event.id, draft);
        router.back();
      }}
    />
  );
}
