import api from "./api";
import { logger } from "@/utils/logger";

export interface MixRadiusCustomer {
  id: string;
  member_id: string;
  username: string;
  fullname: string;
  name?: string;
  address: string;
  phonenumber: string;
  plan_name: string;
  auth_status: string;
  expired_on: string;
  expiration?: string;
  owner_name: string;
  group_name?: string;
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

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
}

export interface OwnerGroup {
  id: string;
  name: string;
  owners: string[];
  isActive: boolean;
  siteId?: string;
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

const isMixRadiusCustomerArray = (
  payload: unknown,
): payload is MixRadiusCustomer[] => Array.isArray(payload);

const extractMixRadiusResponsePayload = (payload: unknown) => {
  if (isPaginatedMixRadiusResponse(payload) || isMixRadiusCustomerArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  return (payload as ApiEnvelope<unknown>).data;
};

const normalizeMixRadiusResponse = (payload?: unknown): MixRadiusResponse => {
  if (isPaginatedMixRadiusResponse(payload)) {
    return payload;
  }

  if (isMixRadiusCustomerArray(payload)) {
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
    authStatus: string = "Disabled-Users",
  ) => {
    const params: Record<string, string | number> = {
      authStatus,
      search,
      searchType: "all",
      start: page * pageSize,
      length: pageSize,
      draw: DEFAULT_MIXRADIUS_DRAW,
    };

    if (groupId) {
      params.groupId = groupId;
    } else if (owner) {
      params.ownerName = owner;
    }

    logger.info(
      `[MixRadius] Requesting: /api/mobile/mixradius/customers params:`,
      JSON.stringify(params),
    );

    const response = await api.get<
      ApiEnvelope<MixRadiusResponse | MixRadiusCustomer[]> | MixRadiusResponse
    >("/api/mobile/mixradius/customers", { params });

    return normalizeMixRadiusResponse(
      extractMixRadiusResponsePayload(response.data),
    );
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
      const response = await api.get<ApiEnvelope<OwnerGroup[]> | OwnerGroup[]>(
        "/api/mobile/mixradius/groups",
      );

      if (Array.isArray(response.data)) {
        return response.data;
      }

      return Array.isArray(response.data.data) ? response.data.data : [];
    } catch (error) {
      logger.error("Failed to fetch owner groups", error);
      return [];
    }
  },

};
