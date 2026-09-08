import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { importAll, loadAll, type ImportMode } from '@/db/backup.repo';
import { SCHEMA_VERSION } from '@/db/migrations';
import { useAllData } from '@/hooks/use-data';
import { backupFileName, buildBackup, parseBackup } from '@/logic/backup';
import { todayIso } from '@/ui/components/date-field';
import { AppButton, Card, InfoRow, SectionTitle } from '@/ui/components/primitives';
import { fontSize, spacing, useTheme } from '@/ui/theme';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const colors = useTheme();
  const { data } = useAllData();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const events = data ?? [];
  const roundCount = events.reduce((total, item) => total + item.rounds.length, 0);

  const fail = (message: string) => {
    setStatus(null);
    Alert.alert('Échec', message);
  };

  const exportBackup = async () => {
    setBusy(true);
    try {
      const snapshot = await loadAll(db);
      const backup = buildBackup(snapshot, new Date().toISOString());

      const file = new File(Paths.cache, backupFileName(todayIso()));
      if (file.exists) file.delete();
      file.create();
      file.write(JSON.stringify(backup, null, 2));

      setStatus(`${backup.events.length} events et ${backup.rounds.length} rondes exportés.`);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Sauvegarde report_yugioh',
        });
      } else {
        Alert.alert('Sauvegarde créée', `Fichier écrit dans :\n${file.uri}`);
      }
    } catch (cause) {
      fail(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const runImport = async (mode: ImportMode, data: Awaited<ReturnType<typeof loadAll>>) => {
    setBusy(true);
    try {
      const summary = await importAll(db, data, mode);
      setStatus(`${summary.events} events et ${summary.rounds} rondes importés.`);
    } catch (cause) {
      fail(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const importBackup = async () => {
    setBusy(true);
    try {
      const picked = await File.pickFileAsync({ mimeTypes: ['application/json'] });
      if (picked.canceled) return;

      const parsed = parseBackup(await picked.result.text());
      if (!parsed.ok) {
        fail(parsed.error);
        return;
      }

      const { data: imported } = parsed.backup;
      const rounds = imported.reduce((total, item) => total + item.rounds.length, 0);

      Alert.alert(
        'Importer cette sauvegarde ?',
        `Le fichier contient ${imported.length} events et ${rounds} rondes.`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Ajouter à l’existant',
            onPress: () => void runImport('append', imported),
          },
          {
            text: 'Remplacer tout',
            style: 'destructive',
            onPress: () =>
              Alert.alert(
                'Remplacer toutes les données ?',
                `Tes ${events.length} events actuels et leurs ${roundCount} rondes seront définitivement supprimés.`,
                [
                  { text: 'Annuler', style: 'cancel' },
                  {
                    text: 'Remplacer',
                    style: 'destructive',
                    onPress: () => void runImport('replace', imported),
                  },
                ]
              ),
          },
        ]
      );
    } catch (cause) {
      fail(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <SectionTitle>Sauvegarde</SectionTitle>
        <Text style={[styles.note, { color: colors.textMuted }]}>
          Les données vivent uniquement sur ce téléphone : désinstaller l'app les efface. Exporte
          après chaque tournoi et garde le fichier sur ton Drive.
        </Text>

        <AppButton
          label={busy ? 'Patiente…' : 'Exporter les données'}
          onPress={() => void exportBackup()}
          disabled={busy}
        />
        <AppButton
          label="Importer une sauvegarde"
          variant="secondary"
          onPress={() => void importBackup()}
          disabled={busy}
        />

        {status ? <Text style={[styles.status, { color: colors.win }]}>{status}</Text> : null}
      </Card>

      <Card>
        <SectionTitle>Base de données</SectionTitle>
        <InfoRow label="Events" value={String(events.length)} />
        <InfoRow label="Rondes" value={String(roundCount)} />
        <InfoRow label="Version du schéma" value={String(SCHEMA_VERSION)} />
      </Card>

      <Card>
        <SectionTitle>Conventions de calcul</SectionTitle>
        <Text style={[styles.note, { color: colors.textMuted }]}>
          • Une nulle (1-1) compte comme une défaite dans le taux de victoire, mais reste visible
          dans le bilan affiché (5-2-1).{'\n'}• Une ronde laissée à 0-0 est « en cours » et exclue de
          toutes les stats.{'\n'}• Un bye (aucun lancer de dé, victoire, pas d'adversaire) compte au
          bilan mais est exclu des stats de dé et des matchups.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  note: {
    fontSize: fontSize.small,
    lineHeight: 20,
  },
  status: {
    fontSize: fontSize.small,
    fontWeight: '600',
  },
});
