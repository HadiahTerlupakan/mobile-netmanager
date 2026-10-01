import React from 'react';

import { useAuth } from '@/context/AuthContext';
import { tentukanPersonaTema, TemaPersonaProvider } from '@/theme';

/** Memasang tema identitas sesuai persona pengguna yang sedang login (tanpa login → biru bawaan). */
export function TemaPersonaPenggunaProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return <TemaPersonaProvider persona={tentukanPersonaTema(user)}>{children}</TemaPersonaProvider>;
}
