import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { deleteEvent, duplicateEvent } from '@/db/events.repo';
import { useAllData } from '@/hooks/use-data';
import { eventTypeLabel } from '@/logic/constants';
import { normalizeDeckKey } from '@/logic/decks';
import type { EventWithRounds } from '@/logic/types';
import { EmptyState } from '@/ui/components/primitives';
import { EventListItem } from '@/ui/components/list-items';
import { fontSize, radius, spacing, TOUCH_TARGET, useTheme } from '@/ui/theme';
import { HeaderActions } from '@/ui/header-actions';

/** Au-delà de ce nombre d'events, la barre de recherche devient utile. */
const SEARCH_THRESHOLD = 10;

export default function EventsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const colors = useTheme();
  const { data, loading } = useAllData();
  const [query, setQuery] = useState('');

  const events = data ?? [];

  const sections = useMemo(() => {
    const needle = normalizeDeckKey(query);
    const filtered =
      query.trim() === ''
        ? events
        : events.filter(({ event }) =>
            [event.name, event.myDeck, eventTypeLabel(event.type)]
              .map((part) => normalizeDeckKey(part))
              .some((key) => key.includes(needle))
          );

    // Regroupement par année : le tri par date décroissante vient déjà du SQL.
    const byYear = new Map<string, EventWithRounds[]>();
    for (const item of filtered) {
      const year = item.event.date.slice(0, 4);
      const list = byYear.get(year) ?? [];
      list.push(item);
      byYear.set(year, list);
    }

    return [...byYear.entries()].map(([year, items]) => ({ title: year, data: items }));
  }, [events, query]);

  const confirmDelete = (id: number, name: string) => {
    Alert.alert('Supprimer cet event ?', `« ${name} » et toutes ses rondes seront perdus.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => void deleteEvent(db, id),
      },
    ]);
  };

  const openMenu = (item: EventWithRounds) => {
    Alert.alert(item.event.name, undefined, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Modifier', onPress: () => router.push(`/events/${item.event.id}/edit`) },
      { text: 'Dupliquer', onPress: () => void duplicateEvent(db, item.event.id) },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => confirmDelete(item.event.id, item.event.name),
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <HeaderActions />

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.event.id)}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          events.length > SEARCH_THRESHOLD ? (
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher un event, un deck…"
              placeholderTextColor={colors.textFaint}
              style={[
                styles.search,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />
          ) : null
        }
        renderSectionHeader={({ section }) => (
          <Text style={[styles.year, { color: colors.textMuted }]}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <EventListItem
            event={item.event}
            rounds={item.rounds}
            onPress={() => router.push(`/events/${item.event.id}`)}
            onLongPress={() => openMenu(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          loading ? null : query.trim() !== '' ? (
            <EmptyState title="Aucun résultat" message="Essaie un autre nom d'event ou de deck." />
          ) : (
            <EmptyState
              title="Aucun event"
              message="Ajoute ton premier tournoi avec le bouton + en bas à droite."
            />
          )
        }
      />

      <Pressable
        accessibilityLabel="Ajouter un event"
        accessibilityRole="button"
        onPress={() => router.push('/events/new')}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
        ]}>
        <Text style={[styles.fabLabel, { color: colors.primaryText }]}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 3,
    gap: spacing.sm,
  },
  search: {
    minHeight: TOUCH_TARGET,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.body,
    marginBottom: spacing.md,
  },
  year: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  separator: {
    height: spacing.sm,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabLabel: {
    fontSize: 32,
    fontWeight: '400',
    lineHeight: 36,
  },
});
