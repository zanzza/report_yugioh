import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { fontSize, spacing, useTheme } from './theme';

/**
 * Accès aux stats et aux réglages depuis l'en-tête de la liste d'events.
 *
 * Rendu via `<Stack.Screen options>` : c'est la façon d'ajuster les options de
 * navigation depuis l'écran lui-même avec expo-router.
 */
export function HeaderActions() {
  const colors = useTheme();

  return (
    <Stack.Screen
      options={{
        headerRight: () => (
          <View style={styles.actions}>
            <Link href="/stats" style={[styles.action, { color: colors.primary }]}>
              Stats
            </Link>
            <Link href="/settings" style={[styles.action, { color: colors.primary }]}>
              Réglages
            </Link>
          </View>
        ),
      }}
    />
  );
}

/** Bouton texte à droite de l'en-tête — « Enregistrer » des formulaires. */
export function HeaderButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const colors = useTheme();

  return (
    <Stack.Screen
      options={{
        headerRight: () => (
          <Text
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            onPress={disabled ? undefined : onPress}
            style={[
              styles.action,
              { color: disabled ? colors.textFaint : colors.primary, fontWeight: '700' },
            ]}>
            {label}
          </Text>
        ),
      }}
    />
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  action: {
    fontSize: fontSize.body,
    fontWeight: '600',
    paddingVertical: spacing.sm,
  },
});
