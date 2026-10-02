import { useEffect, useMemo } from "react";

import type { TopologyData } from "@/components/organisms/topology/topologyTypes";
import { useAuth } from "@/context/AuthContext";
import { useApiQuery } from "@/hooks/queries";
import api from "@/services/api";
import { getUserFriendlyError } from "@/utils/errorHandling";
import { logger } from "@/utils/logger";
import { countInventoryDevices } from "@/utils/topology/topologyDevices";

const TOPOLOGY_ENDPOINT = "/api/mobile/topology";
const TOPOLOGY_QUERY_KEY = ["topology"];
/** Data topologi jarang berubah; cache 5 menit. */
const TOPOLOGY_STALE_TIME_MS = 5 * 60 * 1000;

type TopologyResponseBody = TopologyData | { data?: TopologyData };

/** Respons API bisa terbungkus `{ data: ... }` atau langsung TopologyData. */
function unwrapTopologyResponse(body: TopologyResponseBody): TopologyData {
  const wrapped = (body as { data?: TopologyData })?.data;
  return wrapped || (body as TopologyData);
}

/**
 * Ambil data topologi jaringan (perangkat, node, edge, KMZ) untuk layar peta.
 * Tanpa izin topologi query tidak dijalankan (sebelumnya tetap memanggil API → 403).
 */
export function useTopologyData(isDiizinkan = true) {
  const { token } = useAuth();

  const { data, isPending, error, refetch } = useApiQuery<TopologyData>({
    queryKey: TOPOLOGY_QUERY_KEY,
    queryFn: async () => {
      const response = await api.get<TopologyResponseBody>(TOPOLOGY_ENDPOINT);
      return unwrapTopologyResponse(response.data);
    },
    enabled: isDiizinkan && !!token,
    staleTime: TOPOLOGY_STALE_TIME_MS,
  });

  const errorMessage = useMemo(
    () => (error ? getUserFriendlyError(error).message : null),
    [error],
  );

  useEffect(() => {
    if (data) logger.info("[Topology] Total devices loaded:", countInventoryDevices(data));
  }, [data]);

  return { data, isLoading: isPending, errorMessage, refetch };
}
