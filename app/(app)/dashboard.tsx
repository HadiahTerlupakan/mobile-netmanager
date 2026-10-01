import { ScreenErrorBoundary } from '@/components/atoms/ScreenErrorBoundary';
import { KaryawanSalesDashboardScreen } from '@/components/screens/KaryawanSalesDashboardScreen';
import { KaryawanStaffDashboardScreen } from '@/components/screens/KaryawanStaffDashboardScreen';
import { KaryawanTeknisiDashboardScreen } from '@/components/screens/KaryawanTeknisiDashboardScreen';
import { MitraSalesDashboardScreen } from '@/components/screens/MitraSalesDashboardScreen';
import { MitraTeknisiDashboardScreen } from '@/components/screens/MitraTeknisiDashboardScreen';
import { useAuth } from '@/context/AuthContext';
import { tentukanPersona, type Persona } from '@/utils/persona';
import React from 'react';

/** Beranda staff karyawan; juga dipakai sementara oleh Finance & Direktur. */
const berandaStaff = () => (
    <ScreenErrorBoundary screenName="DashboardStaff">
        <KaryawanStaffDashboardScreen />
    </ScreenErrorBoundary>
);

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
    KARYAWAN_STAFF: berandaStaff,
    // SEMENTARA: Finance & Direktur memakai Beranda Staff sampai layar khususnya
    // dibuat (docs/architecture/persona-pengguna-design.md §3 langkah 5). Persona tetap
    // terpisah supaya nanti cukup mengganti baris ini.
    KARYAWAN_FINANCE: berandaStaff,
    KARYAWAN_DIREKTUR: berandaStaff,
};

/** Route Beranda: memilih layar dari persona (`tentukanPersona`, satu-satunya definisi persona). */
export default function Dashboard() {
    const { user } = useAuth();
    const LayarBeranda = LAYAR_BERANDA[tentukanPersona(user)];
    return <LayarBeranda />;
}
