import { Config } from '@/constants/Config';
import { logger } from '@/utils/logger';
import React, { createContext, useContext, useMemo } from 'react';

export type TenantContextType = {
  tenantUrl: string | null;
  isLoading: boolean;
  setTenant: (url: string) => Promise<void>;
  clearTenant: () => Promise<void>;
};

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  // Always use Config.API_URL as we disabled multi-tenant
  const tenantUrl = Config.API_URL;
  const isLoading = false;

  const setTenant = async (url: string) => {
     logger.warn('Multi-tenant is disabled. Ignoring setTenant:', url);
  };

  const clearTenant = async () => {
    logger.warn('Multi-tenant is disabled. Ignoring clearTenant');
  };

  const value = useMemo(() => ({
    tenantUrl,
    isLoading,
    setTenant,
    clearTenant
  }), [tenantUrl, isLoading]);

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
