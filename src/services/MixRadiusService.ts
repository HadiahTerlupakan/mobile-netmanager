import api from "./api";

export interface MixRadiusCustomer {
  id: string;
  member_id: string;
  username: string;
  fullname: string;
  address: string;
  phonenumber: string;
  plan_name: string;
  auth_status: string;
  expired_on: string;
  owner_name: string;
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
  invoices?: MixRadiusInvoice[];
}

export interface MixRadiusResponse {
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: MixRadiusCustomer[];
}

export interface OwnerGroup {
  id: string;
  name: string;
  owners: string[];
  isActive: boolean;
}

export const MixRadiusService = {
  getIsolirCustomers: async (
    search: string = "",
    page: number = 0,
    pageSize: number = 20,
    owner?: string,
    groupId?: string,
  ) => {
    try {
      const params: any = {
        authStatus: "Disabled-Users",
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

      // Note: api baseURL is Config.API_URL, so we append /api/...
      const response = await api.get<MixRadiusResponse>(
        "/api/integrations/mixradius/customers",
        { params },
      );
      return response.data;
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
      console.error("Failed to fetch customer detail", error);
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
      console.error("Failed to fetch owners", error);
      return [];
    }
  },

  getOwnerGroups: async () => {
    try {
      const response = await api.get<OwnerGroup[]>(
        "/api/integrations/mixradius/groups",
      );
      return response.data;
    } catch (error) {
      console.error("Failed to fetch owner groups", error);
      return [];
    }
  },
};
