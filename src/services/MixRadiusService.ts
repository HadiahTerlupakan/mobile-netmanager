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

const normalizeMixRadiusResponse = (payload?: unknown): MixRadiusResponse => {
  if (isPaginatedMixRadiusResponse(payload)) {
    return payload;
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

    const response = await api.get<ApiEnvelope<MixRadiusResponse>>(
      "/api/mobile/mixradius/customers",
      { params },
    );

    return normalizeMixRadiusResponse(response.data.data);
  },

  getOwnerGroups: async (): Promise<OwnerGroup[]> => {
    try {
      const response = await api.get<ApiEnvelope<OwnerGroup[]>>(
        "/api/mobile/mixradius/groups",
      );

      return Array.isArray(response.data.data) ? response.data.data : [];
    } catch (error) {
      logger.error("Failed to fetch owner groups", error);
      return [];
    }
  },
};
