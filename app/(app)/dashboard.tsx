import { ScreenErrorBoundary } from '@/components/atoms/ScreenErrorBoundary';
import { KaryawanSalesDashboardScreen } from '@/components/screens/KaryawanSalesDashboardScreen';
import { KaryawanTeknisiDashboardScreen } from '@/components/screens/KaryawanTeknisiDashboardScreen';
import { MitraSalesDashboardScreen } from '@/components/screens/MitraSalesDashboardScreen';
import { MitraTeknisiDashboardScreen } from '@/components/screens/MitraTeknisiDashboardScreen';
import { useAuth } from '@/context/AuthContext';
import { tentukanPersona, type Persona } from '@/utils/persona';
import React from 'react';

/** Beranda per persona; `Record` memaksa persona baru dijawab saat kompilasi. */
const LAYAR_BERANDA: Record<Persona, () => React.JSX.Element> = {
    MITRA_SALES: () => <MitraSalesDashboardScreen />,
    MITRA_TEKNISI: () => <MitraTeknisiDashboardScreen />,
    KARYAWAN_SALES: () => (
        <ScreenErrorBoundary screenName="DashboardSales">
            <KaryawanSalesDashboardScreen />
        </ScreenErrorBoundary>
    ),
    KARYAWAN_TEKNISI: () => (
        <ScreenErrorBoundary screenName="Dashboard">
            <KaryawanTeknisiDashboardScreen />
        </ScreenErrorBoundary>
    ),
};

/** Route Beranda: memilih layar dari persona (`tentukanPersona`, satu-satunya definisi persona). */
export default function Dashboard() {
    const { user } = useAuth();
    const LayarBeranda = LAYAR_BERANDA[tentukanPersona(user)];
    return <LayarBeranda />;
}
