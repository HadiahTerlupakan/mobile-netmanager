/**
 * Warna netral tampilan premium (kartu sorotan bergradien) yang sama untuk
 * semua persona. Warna identitas gradien ada di palet persona
 * (`gradienAwal`/`gradienAkhir`); teks lembut di atas gradien memakai
 * `utamaGaris` persona.
 */
export const DESAIN_PREMIUM = {
  /** Aksen angka capaian (bagi hasil, skor) di atas gradien gelap. */
  aksenEmas: '#fbbf24',
  garisDiAtasGelap: 'rgba(255,255,255,0.12)',
  latarLayar: '#f8fafc',
  ikonNetral: '#64748b',
} as const;

/** Angka sejajar per digit agar nominal mudah dibandingkan antarbaris. */
export const GAYA_ANGKA_TABULAR = { fontVariant: ['tabular-nums' as const] };
