import React from 'react';

import { ScreenErrorBoundary } from '@/components/atoms/ScreenErrorBoundary';
import { FormGantiPassword } from '@/components/organisms/FormGantiPassword';

/** Ganti password investor: endpointnya terpisah karena token investor beraudience sendiri. */
export default function GantiPasswordInvestor() {
  return (
    <ScreenErrorBoundary screenName="GantiPasswordInvestor">
      <FormGantiPassword
        endpoint="/api/mobile/investor/password"
        namaLayar="GantiPasswordInvestor"
        rute="/(investor)/ganti-password"
      />
    </ScreenErrorBoundary>
  );
}
