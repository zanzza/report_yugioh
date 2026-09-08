import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Suspense } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { DB_NAME, DB_OPTIONS } from '@/db/client';
import { migrate } from '@/db/migrations';
import { useIsDark, useTheme } from '@/ui/theme';

function Loading() {
  const colors = useTheme();
  return (
    <View style={[styles.loading, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export default function RootLayout() {
  const isDark = useIsDark();
  const colors = useTheme();

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Suspense fallback={<Loading />}>
        {/* `migrate` crée le schéma au premier lancement et pose les pragmas
            (dont foreign_keys, sans lequel le CASCADE des rondes est ignoré). */}
        <SQLiteProvider
          databaseName={DB_NAME}
          options={DB_OPTIONS}
          onInit={migrate}
          useSuspense>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTitleStyle: { color: colors.text },
              headerTintColor: colors.primary,
              contentStyle: { backgroundColor: colors.background },
            }}>
            <Stack.Screen name="index" options={{ title: 'Mes events' }} />
            <Stack.Screen name="events/new" options={{ title: 'Nouvel event' }} />
            <Stack.Screen name="events/[id]/index" options={{ title: 'Event' }} />
            <Stack.Screen name="events/[id]/edit" options={{ title: "Modifier l'event" }} />
            <Stack.Screen name="events/[id]/summary" options={{ title: 'Résumé' }} />
            <Stack.Screen name="events/[id]/rounds/new" options={{ title: 'Nouvelle ronde' }} />
            <Stack.Screen name="events/[id]/rounds/[roundId]" options={{ title: 'Ronde' }} />
            <Stack.Screen name="stats" options={{ title: 'Statistiques' }} />
            <Stack.Screen name="settings" options={{ title: 'Réglages' }} />
          </Stack>
        </SQLiteProvider>
      </Suspense>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
