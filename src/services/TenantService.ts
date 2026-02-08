import { Config } from '@/constants/Config';
import { logger } from '@/utils/logger';

// Multi-tenant disabled: Always use Config.API_URL
let currentTenantUrl: string | null = Config.API_URL;

export const TenantService = {
  setTenantUrl: (url: string | null) => {
    // No-op
    logger.warn('Multi-tenant is disabled. Ignoring setTenantUrl:', url);
  },

  getTenantUrl: () => {
    return Config.API_URL;
  },

  saveTenantUrl: async (url: string) => {
    // No-op
    logger.warn('Multi-tenant is disabled. Ignoring saveTenantUrl:', url);
  },

  loadTenantUrl: async () => {
    // Always return Config.API_URL
    currentTenantUrl = Config.API_URL;
    return Config.API_URL;
  },

  clearTenantUrl: async () => {
    // No-op
    logger.warn('Multi-tenant is disabled. Ignoring clearTenantUrl');
  }
};
