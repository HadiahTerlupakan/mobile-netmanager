import api from "./api";
import { logger } from "@/utils/logger";

export interface MixRadiusCustomer {
  id: string;
  member_id: string;
  username: string;
  fullname: string;
  name?: string; // Optional alias for compatibility
  address: string;
  phonenumber: string;
  plan_name: string;
  auth_status: string;
  expired_on: string;
  expiration?: string; // Optional alias
  owner_name: string;
  group_name?: string; // Optional alias
  online?: boolean;
  active_session_ip?: string;
}

export interface MixRadiusInvoice {
  id: string;
  invoice_number: string;
  plan_name: string;
  amount: string;
  activation_date: string;
  deadline_date: string;
  owner: string;
  status: string;
}

export interface MixRadiusCustomerDetail {
  id: string;
  member_id: string;
  username: string;
  fullname: string;
  email: string;
  phonenumber: string;
  address: string;
  plan_name: string;
  payment_type: string;
  renewed_on: string;
  expired_on: string;
  auth_status: string;
  owner_name?: string;
  online?: boolean;
  active_session_ip?: string;
  invoices?: MixRadiusInvoice[];
}

export interface MixRadiusResponse {
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: MixRadiusCustomer[];
}

interface MixRadiusWrappedResponse {
  success?: boolean;
  data?: MixRadiusResponse | MixRadiusCustomer[];
}

export interface OwnerGroup {
  id: string;
  name: string;
  owners: string[];
  isActive: boolean;
}

const DEFAULT_MIXRADIUS_DRAW = 1;

const buildPaginatedMixRadiusResponse = (
  customers: MixRadiusCustomer[],
  draw: number = DEFAULT_MIXRADIUS_DRAW,
  recordsTotal: number = customers.length,
  recordsFiltered: number = customers.length,
): MixRadiusResponse => ({
  draw,
  recordsTotal,
  recordsFiltered,
  data: customers,
});

const isPaginatedMixRadiusResponse = (
  payload: unknown,
): payload is MixRadiusResponse => {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<MixRadiusResponse>;

  return (
    typeof candidate.draw === "number" &&
    typeof candidate.recordsTotal === "number" &&
    typeof candidate.recordsFiltered === "number" &&
    Array.isArray(candidate.data)
  );
};

const normalizeMixRadiusResponse = (
  payload?: MixRadiusResponse | MixRadiusCustomer[],
): MixRadiusResponse => {
  if (isPaginatedMixRadiusResponse(payload)) {
    return payload;
  }

  if (Array.isArray(payload)) {
    return buildPaginatedMixRadiusResponse(payload);
  }

  return buildPaginatedMixRadiusResponse([]);
};

export const MixRadiusService = {
  getIsolirCustomers: async (
    search: string = "",
    page: number = 0,
    pageSize: number = 20,
    owner?: string,
    groupId?: string,
    authStatus: string = "Disabled-Users", // Allow override
  ) => {
    try {
      const params: Record<string, string | number> = {
        authStatus: authStatus,
        search: search,
        searchType: "all",
        start: page * pageSize,
        length: pageSize,
        draw: 1,
      };

      if (groupId) {
        params.groupId = groupId;
      } else if (owner) {
        params.ownerName = owner;
      }

      // Note: api baseURL is dynamic from TenantService, so we append /api/...
      logger.info(`[MixRadius] Requesting: /api/mobile/mixradius/customers params:`, JSON.stringify(params));
      const response = await api.get<MixRadiusWrappedResponse | MixRadiusCustomer[]>(
        "/api/mobile/mixradius/customers",
        { params },
      );

      const responseBody = response.data;

      if (Array.isArray(responseBody)) {
        logger.info(`[MixRadius] Raw response is legacy array length: ${responseBody.length}`);
        return normalizeMixRadiusResponse(responseBody);
      }

      logger.info(`[MixRadius] Raw response keys:`, Object.keys(responseBody));
      if (responseBody.data) {
        logger.info(`[MixRadius] response.data.data keys:`, Object.keys(responseBody.data));
        if (Array.isArray(responseBody.data)) {
          logger.info(`[MixRadius] response.data.data is Array length: ${responseBody.data.length}`);
        } else {
          logger.info(`[MixRadius] response.data.data is Object`);
          if (responseBody.data.data) {
            logger.info(`[MixRadius] response.data.data.data is Array length: ${responseBody.data.data.length}`);
          }
        }
      }

      if (responseBody.success && responseBody.data) {
        logger.info(`[MixRadius] Returning normalized wrapped payload`);
        return normalizeMixRadiusResponse(responseBody.data);
      }

      logger.info(`[MixRadius] Returning normalized fallback payload`);
      return normalizeMixRadiusResponse(responseBody.data);
    } catch (error) {
      throw error;
    }
  },

  getCustomerDetail: async (
    customerId: string,
  ): Promise<MixRadiusCustomerDetail | null> => {
    try {
      const response = await api.get<{
        success: boolean;
        data: MixRadiusCustomerDetail;
      }>(`/api/integrations/mixradius/customers/${customerId}`);
      return response.data.data;
    } catch (error) {
      logger.error("Failed to fetch customer detail", error);
      return null;
    }
  },

  getOwners: async () => {
    try {
      const response = await api.get<{ data: string[] }>(
        "/api/integrations/mixradius/owners",
      );
      return response.data.data;
    } catch (error) {
      logger.error("Failed to fetch owners", error);
      return [];
    }
  },

  getOwnerGroups: async (): Promise<OwnerGroup[]> => {
    try {
      const response = await api.get<{
        data?: OwnerGroup[];
      }>(
        "/api/integrations/mixradius/groups",
      );

      if (Array.isArray(response.data)) {
        return response.data as unknown as OwnerGroup[];
      }

      if (response.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }

      logger.warn("Unexpected owner groups format:", response.data);
      return [];
    } catch (error) {
      logger.error("Failed to fetch owner groups", error);
      return [];
    }
  },

  requestDismantle: async (customerId: string, reason: string, notes?: string) => {
    const response = await api.post("/api/integrations/mixradius/dismantle", {
      customerId,
      reason,
      notes,
    });
    return response.data;
  },
};
