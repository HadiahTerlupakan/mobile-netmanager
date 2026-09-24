import { ScreenErrorBoundary } from '@/components/atoms/ScreenErrorBoundary';
import { KaryawanProfileScreen } from '@/components/screens/profile/KaryawanProfileScreen';
import { MitraSalesProfileScreen } from '@/components/screens/profile/MitraSalesProfileScreen';
import { MitraTeknisiProfileScreen } from '@/components/screens/profile/MitraTeknisiProfileScreen';
import { useAuth } from '@/context/AuthContext';
import { tentukanPersona, type Persona } from '@/utils/persona';
import React from 'react';

/** Layar Profil per persona; `Record` memaksa persona baru dijawab saat kompilasi. */
const LAYAR_PROFIL: Record<Persona, () => React.JSX.Element> = {
    MITRA_SALES: () => <MitraSalesProfileScreen />,
    MITRA_TEKNISI: () => <MitraTeknisiProfileScreen />,
    KARYAWAN_SALES: () => <KaryawanProfileScreen />,
    KARYAWAN_TEKNISI: () => <KaryawanProfileScreen />,
};

/** Route Profil: memilih layar dari persona (`tentukanPersona`, satu-satunya definisi persona). */
export default function Profile() {
    const { user } = useAuth();
    const LayarProfil = LAYAR_PROFIL[tentukanPersona(user)];

    return (
        <ScreenErrorBoundary screenName="ProfileMultiplexer">
            <LayarProfil />
        </ScreenErrorBoundary>
    );
}
