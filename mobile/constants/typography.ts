export const Typography = {
  display: { fontSize: 44, fontFamily: 'InstrumentSerif_400Regular', lineHeight: 46, letterSpacing: -0.88 },
  h1:      { fontSize: 28, fontFamily: 'Manrope_700Bold',             lineHeight: 32, letterSpacing: -0.56 },
  h2:      { fontSize: 22, fontFamily: 'Manrope_700Bold',             lineHeight: 26, letterSpacing: -0.44 },
  h3:      { fontSize: 18, fontFamily: 'Manrope_600SemiBold',         lineHeight: 23, letterSpacing: -0.18 },
  body:    { fontSize: 15, fontFamily: 'Manrope_400Regular',          lineHeight: 22, letterSpacing: 0 },
  bodyStrong: { fontSize: 15, fontFamily: 'Manrope_600SemiBold',      lineHeight: 22, letterSpacing: 0 },
  cap:     { fontSize: 13, fontFamily: 'Manrope_500Medium',           lineHeight: 18, letterSpacing: 0 },
  capUp:   { fontSize: 11, fontFamily: 'Manrope_600SemiBold',         lineHeight: 13, letterSpacing: 0.88, textTransform: 'uppercase' as const },
  micro:   { fontSize: 11, fontFamily: 'Manrope_500Medium',           lineHeight: 14, letterSpacing: 0 },
} as const;

export const Spacing = {
  xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32,
  screen: 20,
} as const;

export const Radius = {
  xs: 6, sm: 8, md: 14, card: 20, sheet: 28, pill: 999,
} as const;
