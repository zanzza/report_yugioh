import { useColorScheme } from 'react-native';

import type { EventType, MatchOutcome } from '@/logic/types';

/**
 * Thème de l'app : un objet de couleurs par mode, plus des échelles d'espacement
 * et de rayons. Pas de librairie de style — `StyleSheet` et ce fichier suffisent.
 */

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  primaryText: string;
  win: string;
  loss: string;
  draw: string;
  unplayed: string;
  danger: string;
  track: string;
}

const palette: Record<'light' | 'dark', ThemeColors> = {
  light: {
    background: '#FFFFFF',
    surface: '#F4F6F8',
    surfaceRaised: '#FFFFFF',
    border: '#E1E4EA',
    text: '#14161A',
    textMuted: '#666E7D',
    textFaint: '#9AA1AE',
    primary: '#2563EB',
    primaryText: '#FFFFFF',
    win: '#15803D',
    loss: '#B91C1C',
    draw: '#A16207',
    unplayed: '#8B93A1',
    danger: '#B91C1C',
    track: '#E1E4EA',
  },
  dark: {
    background: '#0D0F12',
    surface: '#171A1F',
    surfaceRaised: '#1F2329',
    border: '#2A2F37',
    text: '#F2F4F7',
    textMuted: '#98A1AF',
    textFaint: '#6B7280',
    primary: '#5B8DEF',
    primaryText: '#0D0F12',
    win: '#34D399',
    loss: '#F87171',
    draw: '#FBBF24',
    unplayed: '#6B7280',
    danger: '#F87171',
    track: '#2A2F37',
  },
};

/** Couleur d'accent par type d'event, pour les badges de la liste. */
export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  YCS: '#D97706',
  WCQ: '#7C3AED',
  OTS: '#0891B2',
  REGIONAL: '#059669',
  LOCALS: '#64748B',
  OTHER: '#78716C',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
} as const;

/**
 * Hauteur minimale des zones tactiles. 56 px sur l'écran de saisie de ronde :
 * il faut pouvoir viser au pouce, debout, entre deux rondes.
 */
export const TOUCH_TARGET = 48;
export const TOUCH_TARGET_LARGE = 56;

export const fontSize = {
  caption: 12,
  small: 13,
  body: 15,
  subtitle: 17,
  title: 20,
  display: 28,
  hero: 34,
} as const;

export function useTheme(): ThemeColors {
  return useColorScheme() === 'dark' ? palette.dark : palette.light;
}

export function useIsDark(): boolean {
  return useColorScheme() === 'dark';
}

/** Couleur associée au résultat d'un match — vert, rouge, jaune ou gris. */
export function outcomeColor(colors: ThemeColors, outcome: MatchOutcome): string {
  switch (outcome) {
    case 'WIN':
      return colors.win;
    case 'LOSS':
      return colors.loss;
    case 'DRAW':
      return colors.draw;
    case 'UNPLAYED':
      return colors.unplayed;
  }
}
