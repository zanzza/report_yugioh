import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { fontSize, radius, spacing, TOUCH_TARGET, useTheme } from '../theme';

/**
 * Briques d'interface partagées. Volontairement peu nombreuses et sans
 * librairie de composants : l'app compte six écrans.
 */

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}>
      {children}
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  const colors = useTheme();
  return <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{children}</Text>;
}

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useTheme();

  const background =
    variant === 'primary' ? colors.primary : variant === 'danger' ? 'transparent' : colors.surface;
  const textColor =
    variant === 'primary' ? colors.primaryText : variant === 'danger' ? colors.danger : colors.text;
  const borderColor = variant === 'danger' ? colors.danger : colors.border;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, borderColor, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
        style,
      ]}>
      <Text style={[styles.buttonLabel, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({ title, message }: { title: string; message?: string }) {
  const colors = useTheme();
  return (
    <View style={styles.empty}>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      {message ? (
        <Text style={[styles.emptyMessage, { color: colors.textMuted }]}>{message}</Text>
      ) : null}
    </View>
  );
}

/** Ligne « libellé / valeur », brique des blocs d'information. */
export function InfoRow({ label, value }: { label: string; value: string }) {
  const colors = useTheme();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  button: {
    minHeight: TOUCH_TARGET,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonLabel: {
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.subtitle,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: fontSize.body,
    textAlign: 'center',
    lineHeight: 21,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  infoLabel: {
    fontSize: fontSize.body,
  },
  infoValue: {
    fontSize: fontSize.body,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
});
