import React from 'react';

import { ScreenErrorBoundary } from '@/components/atoms/ScreenErrorBoundary';
import { FormGantiPassword } from '@/components/organisms/FormGantiPassword';

export default function ChangePassword() {
  return (
    <ScreenErrorBoundary screenName="ChangePassword">
      <FormGantiPassword
        endpoint="/api/mobile/profile/password"
        namaLayar="ChangePasswordScreen"
        rute="/(app)/change-password"
      />
    </ScreenErrorBoundary>
  );
}
