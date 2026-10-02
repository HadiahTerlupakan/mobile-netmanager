import { create, type TailwindFn } from 'twrnc';


import { PALET_PERSONA, type PersonaTema, type WarnaTemaPersona } from './temaPersona';

/**
 * Warna kustom twrnc dari palet: `bg-utama`, `bg-utama-kuat`, `text-utama-gelap`,
 * `border-utama-garis`, `bg-utama-sangat-muda`, dst. Opasitas ikut berlaku
 * (`bg-utama/10`). Kelas tailwind lain identik dengan `tw` bawaan.
 */
function keWarnaTwrnc(warna: WarnaTemaPersona) {
  return {
    utama: {
      DEFAULT: warna.utama,
      kuat: warna.utamaKuat,
      gelap: warna.utamaGelap,
      pekat: warna.utamaPekat,
      terang: warna.utamaTerang,
      lembut: warna.utamaLembut,
      pucat: warna.utamaPucat,
      garis: warna.utamaGaris,
      muda: warna.utamaMuda,
      'sangat-muda': warna.utamaSangatMuda,
    },
  };
}

const twPerPersona = new Map<PersonaTema, TailwindFn>();

/**
 * Instans twrnc untuk persona — dibuat sekali lalu dipakai ulang supaya cache
 * gaya twrnc tetap hangat (maksimal sembilan instans seumur aplikasi).
 */
export function ambilTwPersona(persona: PersonaTema): TailwindFn {
  const tersimpan = twPerPersona.get(persona);
  if (tersimpan) return tersimpan;
  const twBaru = create({ theme: { extend: { colors: keWarnaTwrnc(PALET_PERSONA[persona]) } } });
  twPerPersona.set(persona, twBaru);
  return twBaru;
}
