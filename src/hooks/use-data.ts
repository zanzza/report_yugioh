import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';

import { loadAll } from '@/db/backup.repo';
import { getEvent, listEvents } from '@/db/events.repo';
import { getRound, listRounds, nextRoundNumber } from '@/db/rounds.repo';
import { myDeckUsage, opponentDeckUsage } from '@/logic/decks';
import type { EventWithRounds } from '@/logic/types';
import { useQuery } from './use-query';

/** Tous les events, les plus récents d'abord. */
export function useEvents() {
  const db = useSQLiteContext();
  return useQuery(() => listEvents(db), [db]);
}

export function useEvent(id: number | null) {
  const db = useSQLiteContext();
  return useQuery(async () => (id === null ? null : getEvent(db, id)), [db, id]);
}

export function useRounds(eventId: number | null) {
  const db = useSQLiteContext();
  return useQuery(async () => (eventId === null ? [] : listRounds(db, eventId)), [db, eventId]);
}

export function useRound(id: number | null) {
  const db = useSQLiteContext();
  return useQuery(async () => (id === null ? null : getRound(db, id)), [db, id]);
}

/** Numéro pré-calculé pour le bouton « + Ronde N ». */
export function useNextRoundNumber(eventId: number | null) {
  const db = useSQLiteContext();
  return useQuery(async () => (eventId === null ? 1 : nextRoundNumber(db, eventId)), [db, eventId]);
}

/**
 * Toute la base en mémoire : la base des stats globales et des suggestions de
 * decks. Deux `SELECT` suffisent à cette échelle.
 */
export function useAllData() {
  const db = useSQLiteContext();
  return useQuery(() => loadAll(db), [db]);
}

/** Un event et ses rondes : ce qu'attendent les stats et le résumé. */
export function useEventWithRounds(id: number | null) {
  const event = useEvent(id);
  const rounds = useRounds(id);

  const data = useMemo<EventWithRounds | null>(() => {
    if (!event.data) return null;
    return { event: event.data, rounds: rounds.data ?? [] };
  }, [event.data, rounds.data]);

  return {
    data,
    loading: event.loading || rounds.loading,
    error: event.error ?? rounds.error,
  };
}

/** Chips de suggestion pour la saisie des decks. */
export function useDeckSuggestions() {
  const { data, loading } = useAllData();

  return useMemo(() => {
    const inputs = data ?? [];
    return {
      loading,
      opponentDecks: opponentDeckUsage(inputs),
      myDecks: myDeckUsage(inputs),
    };
  }, [data, loading]);
}
