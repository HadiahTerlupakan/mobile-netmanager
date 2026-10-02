import React, { createContext, useContext, useMemo } from 'react';
import type { TailwindFn } from 'twrnc';

import { ambilTemaPersona, PERSONA_TEMA_BAWAAN, type PersonaTema, type TemaPersona } from './temaPersona';
import { ambilTwPersona } from './twPersona';

/** Nilai tema yang dipakai komponen: palet hex + `tw` yang mengenal kelas `utama-*`. */
export interface NilaiTemaPersona extends TemaPersona {
  tw: TailwindFn;
}

/** Tema lengkap untuk satu persona. */
function buatNilaiTema(persona: PersonaTema): NilaiTemaPersona {
  return { ...ambilTemaPersona(persona), tw: ambilTwPersona(persona) };
}

const TemaPersonaContext = createContext<NilaiTemaPersona | null>(null);

let nilaiBawaan: NilaiTemaPersona | null = null;

/** Tema bawaan (biru sales) dibuat malas supaya modul aman diimpor di mana saja. */
function ambilNilaiBawaan(): NilaiTemaPersona {
  nilaiBawaan ??= buatNilaiTema(PERSONA_TEMA_BAWAAN);
  return nilaiBawaan;
}

interface TemaPersonaProviderProps {
  persona: PersonaTema;
  children: React.ReactNode;
}

/**
 * Penyedia tema identitas untuk satu persona. Sengaja tidak membaca
 * AuthContext supaya lapisan tema bebas dari auth/Firebase; penentuan persona
 * dari pengguna login ada di `TemaPersonaPenggunaProvider`.
 */
export function TemaPersonaProvider({ persona, children }: TemaPersonaProviderProps) {
  const nilai = useMemo(() => buatNilaiTema(persona), [persona]);
  return <TemaPersonaContext.Provider value={nilai}>{children}</TemaPersonaContext.Provider>;
}

/**
 * Tema identitas aktif. Di luar penyedia (mis. tes komponen tunggal) jatuh ke
 * tema bawaan biru, sama dengan tampilan sales.
 */
export function useTemaPersona(): NilaiTemaPersona {
  return useContext(TemaPersonaContext) ?? ambilNilaiBawaan();
}
