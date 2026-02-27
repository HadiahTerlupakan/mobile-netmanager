import { ScreenErrorBoundary } from '@/components/atoms/ScreenErrorBoundary';
import { KaryawanProfileScreen } from '@/components/screens/profile/KaryawanProfileScreen';
import { MitraSalesProfileScreen } from '@/components/screens/profile/MitraSalesProfileScreen';
import { MitraTeknisiProfileScreen } from '@/components/screens/profile/MitraTeknisiProfileScreen';
import { useAuth } from '@/context/AuthContext';
import React from 'react';

export default function Profile() {
    const { user } = useAuth();

    const renderProfileContent = () => {
        if (user?.employeeType === 'MITRA_SALES') {
            return <MitraSalesProfileScreen />;
        }

        if (user?.employeeType === 'MITRA_TEKNISI') {
            return <MitraTeknisiProfileScreen />;
        }

        // Default or Fallback: Karyawan User Profile Screen
        return <KaryawanProfileScreen />;
    };

    return (
        <ScreenErrorBoundary screenName="ProfileMultiplexer">
            {renderProfileContent()}
        </ScreenErrorBoundary>
    );
}
