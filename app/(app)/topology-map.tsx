import { TopologySkeleton } from "@/components/molecules/TopologySkeleton";
import { useAuth } from "@/context/AuthContext";
import { useApiQuery } from "@/hooks/queries";
import api from "@/services/api";
import { logger } from "@/utils/logger";
import toGeoJSON from "@/utils/togeojson-wrapper";
import * as MapLibreGL from "@maplibre/maplibre-react-native";
import { FlashList } from "@shopify/flash-list";
import { DOMParser } from "@xmldom/xmldom";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Box,
  Disc,
  Flag,
  Home,
  Layers,
  MapPin,
  RefreshCw,
  Search,
  Server,
  Square,
  X,
} from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  DeviceData,
  DeviceDetailModal,
  DeviceType,
} from "@/components/organisms/topology/DeviceDetailModal";
import { DeviceCreateModal } from "@/components/organisms/topology/DeviceCreateModal";
import { FilterPanel } from "@/components/organisms/topology/FilterPanel";
import { TopologyErrorBoundary } from "@/components/organisms/topology/TopologyErrorBoundary";

// Helper for distance calculation
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c); // in meters
};

const MARKER_COLORS: Record<DeviceType, string> = {
  otb: "#9333ea", // Purple
  odc: "#2563eb", // Blue
  odp: "#06b6d4", // Cyan
  joinbox: "#a855f7", // purple
  pole: "#6b7280", // gray
  pelanggan: "#ea580c", // Orange
  kmz: "#6366f1", // indigo
};

const getDeviceIcon = (type: DeviceType, size: number = 16, color: string = "white") => {
  switch (type) {
    case "otb":
      return <Server size={size} color={color} />;
    case "odc":
      return <Box size={size} color={color} />;
    case "odp":
      return <Disc size={size} color={color} />;
    case "joinbox":
      return <Square size={size} color={color} />;
    case "pole":
      return <Flag size={size} color={color} />;
    case "pelanggan":
      return <Home size={size} color={color} />;
    default:
      return <MapPin size={size} color={color} />;
  }
};

// Helper to determine line color based on device types
const getLineColor = (sourceType: string, targetType: string, defaultColor?: string): string => {
  const s = sourceType?.toLowerCase() || "";
  const t = targetType?.toLowerCase() || "";

  // Feeder: Server/OTB -> ODC (Purple)
  if (
    ((s === "otb" || s === "server" || s === "olt") && t === "odc") ||
    ((t === "otb" || t === "server" || t === "olt") && s === "odc")
  ) {
    return "#D946EF";
  }

  // Distribution: ODC -> ODP (Blue)
  if (
    (s === "odc" && t === "odp") ||
    (t === "odc" && s === "odp")
  ) {
    return "#00FFFF";
  }

  // Drop: ODP -> Pelanggan (Green)
  if (
    (s === "odp" && (t === "pelanggan" || t === "ont")) ||
    (t === "odp" && (s === "pelanggan" || s === "ont"))
  ) {
    return "#39FF14";
  }

  return defaultColor || "#FF0000";
};

// Types
interface TopologyData {
  otbs: {
    id: string;
    name: string;
    location: string | null;
    latitude: number;
    longitude: number;
    notes: string | null;
    images: string[];
    photo?: string;
    inputCoreColor?: string;
  }[];
  odcs: {
    id: string;
    name: string;
    location: string | null;
    latitude: number;
    longitude: number;
    notes: string | null;
    images: string[];
    photo?: string;
    attenuationInput?: string;
    attenuationOutput?: string;
    inputCoreColor?: string;
    capacity?: number; // Added
    splitter?: string; // Added
    usedSlots?: number; // Added
    parent?: {          // Added
      id: string;
      name: string;
      type: string;
    };
    otbCore?: {
      coreColor: string;
      tubeColor: string;
      otb: {
        id: string;
        name: string;
        latitude: number;
        longitude: number;
      };
    };
  }[];
  odps: {
    id: string;
    name: string;
    location: string | null;
    latitude: number;
    longitude: number;
    notes: string | null;
    images: string[];
    photo?: string;
    attenuationInput?: string;
    attenuationOutput?: string;
    inputCoreColor?: string;
    capacity?: number; // Added
    splitter?: string; // Added
    usedSlots?: number; // Added
    parent?: {          // Added
      id: string;
      name: string;
      type: string;
    };
    odcOutput?: {
      coreColor: string;
      tubeColor: string;
      odc: {
        id: string;
        name: string;
        latitude: number;
        longitude: number;
      };
    };
    site?: { name: string };
    _count?: { odpOutput: number };
  }[];
  joinboxes: {
    id: string;
    name: string;
    location: string | null;
    latitude: number;
    longitude: number;
    notes: string | null;
    images: string[];
    photo?: string;
    inputCoreColor?: string;
    capacity?: number; // Added
    splitter?: string; // Added
    usedSlots?: number; // Added
    parent?: {          // Added
      id: string;
      name: string;
      type: string;
    };
  }[];
  poles: {
    id: string;
    name: string;
    location: string | null;
    latitude: number;
    longitude: number;
    notes: string | null;
    images: string[];
    cableSlack: boolean;
    photo?: string;
    inputCoreColor?: string;
    capacity?: number; // Added
    splitter?: string; // Added
    usedSlots?: number; // Added
    parent?: {          // Added
      id: string;
      name: string;
      type: string;
    };
  }[];
  pelanggans: {
    id: string;
    idPelanggan: string;
    nama: string;
    latitude: number;
    longitude: number;
    alamat: string | null;
    status: string;
    odpId: string;
    odp?: {
      id: string;
      name: string;
      latitude: number;
      longitude: number;
    };
  }[];
  nodes?: {
    nodeId: string;
    name: string;
    type: string;
    latitude: number;
    longitude: number;
    photo?: string;
    description: string | null; // Keep for backward compat
    capacity?: number;
    splitter?: string;
    pppoe?: string;
    serialNumber?: string;
    notes?: string | null;
    attenuationIn?: number;
    attenuationOut?: number;
    inputCoreColor?: string;
    usedSlots?: number;
    parent?: {
      id: string;
      name: string;
      type: string;
    };
  }[];
  kmzFiles?: {
    id: string;
    name: string;
    kmlPath: string;
    lineColor: string;
    isActive: boolean;
  }[];
  edges?: {
    id: string;
    source: string;
    target: string;
    sourceType: string;
    targetType: string;
    color: string;
    waypoints?: [number, number][];
  }[];
}

// interface VisibilityState removed (unused)

// MapLibre Config
MapLibreGL.setAccessToken(null); // Not needed for open tiles

// Suppress MapLibre HTTP errors for empty URLs
MapLibreGL.Logger.setLogCallback((log) => {
  const { message } = log;
  // Ignore empty resourceUrl errors
  if (message?.includes("Unable to parse resourceUrl")) {
    return true; // Suppress this log
  }
  return false; // Let other logs through
});

// Helper component for animated lines
const AnimatedConnectionLines = React.memo(
  ({
    shape,
    onLineSelected,
  }: {
    shape: any;
    onLineSelected: (e: any) => void;
  }) => {
    return (
      <MapLibreGL.ShapeSource
        id="linesSource"
        shape={shape}
        onPress={onLineSelected}
      >
        <MapLibreGL.LineLayer
          id="linesLayer"
          // Ensure lines are rendered at the bottom, just above the satellite tiles
          aboveLayerID="google-satellite-tiles"
          style={{
            lineColor: ["get", "color"],
            lineWidth: 4,
            lineOpacity: 1,
          }}
        />
      </MapLibreGL.ShapeSource>
    );
  }
);
AnimatedConnectionLines.displayName = 'AnimatedConnectionLines';

export default function TopologyMapScreen() {
  const router = useRouter();
  const { token } = useAuth();

  // Fetch topology data with useApiQuery
  const {
    data,
    isPending: loading,
    error: queryError,
    refetch: fetchData
  } = useApiQuery<TopologyData>({
    queryKey: ["topology"],
    queryFn: async () => {
      const res = await api.get("/api/mobile/topology");
      // Handle wrapped response { data: ... } or direct response
      return res.data?.data || res.data;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const error = useMemo(() => queryError?.message || null, [queryError]);

  // Use refs instead of state for camera tracking to prevent re-renders
  const zoomRef = useRef(12);
  const [loadingKmz, setLoadingKmz] = useState(false); // Track KMZ loading state
  const viewportRef = useRef<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);

  const [visibility, setVisibility] = useState({
    otb: true,
    odc: true,
    odp: true,
    pole: true,
    joinbox: true,
    pelanggan: true,
    kmz: true,
    lines: true,
  });

  const [kmzFeatures, setKmzFeatures] = useState<GeoJSON.Feature[]>([]);
  const kmzCache = useRef<Map<string, GeoJSON.Feature[]>>(new Map()); // Cache for processed KMZ files
  const cameraRef = useRef<any>(null);

  const [selectedDevice, setSelectedDevice] = useState<{
    data: DeviceData;
    type: DeviceType;
  } | null>(null);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createLocation, setCreateLocation] = useState<{ latitude: number; longitude: number } | undefined>(undefined);

  const [showFilters, setShowFilters] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // OPTIMIZED: Pre-calculate all searchable devices
  const allDevices = useMemo(() => {
    if (!data) return [];
    const devices: any[] = [];
    const add = (arr: any[] | undefined, type: string) => {
      if (arr) arr.forEach((d) => devices.push({ ...d, type }));
    };

    add(data.otbs, "otb");
    add(data.odcs, "odc");
    add(data.odps, "odp");
    add(data.poles, "pole");
    add(data.joinboxes, "joinbox");
    add(data.pelanggans, "pelanggan");

    // Include MappingNodes in search
    if (data.nodes) {
      data.nodes.forEach((node) => {
        let mappedType = "pole"; // Default fallback
        if (node.type) {
          switch (node.type.toLowerCase()) {
            case "server": mappedType = "otb"; break;
            case "odc": mappedType = "odc"; break;
            case "odp": mappedType = "odp"; break;
            case "ont": mappedType = "pelanggan"; break;
            default: mappedType = "pole";
          }
        }

        // Push with normalized ID and mapped type
        devices.push({
          ...node,
          id: node.nodeId,
          type: mappedType,
          originalType: node.type,
          notes: node.description // Map description to notes for DetailModal compatibility
        });
      });
    }

    // Granular logging for debugging
    const inventoryCount =
      (data.otbs?.length || 0) +
      (data.odcs?.length || 0) +
      (data.odps?.length || 0) +
      (data.poles?.length || 0) +
      (data.joinboxes?.length || 0) +
      (data.pelanggans?.length || 0);
    const nodesCount = data.nodes?.length || 0;

    logger.debug(`[allDevices] Built ${devices.length} items. Inventory: ${inventoryCount}, Nodes: ${nodesCount}`);

    return devices;
  }, [data]);

  // Search Logic
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = allDevices.filter((d) => {
      const name = (d.name || d.nama || d.idPelanggan || "").toString();
      return name.toLowerCase().includes(query);
    });

    setSearchResults(filtered.slice(0, 20));
  }, [searchQuery, allDevices]);

  const handleSearchResultPress = (item: any) => {
    Keyboard.dismiss();
    setSearchQuery("");
    setSearchResults([]);

    // Zoom to location
    if (item.latitude && item.longitude && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [Number(item.longitude), Number(item.latitude)],
        zoomLevel: 18,
        animationDuration: 1000,
      });
    }

    // Open detail modal
    handleMarkerPress(item, item.type as DeviceType);
  };

  // Camera position refs for stable MapLibre Camera props
  const cameraCenterRef = useRef<[number, number]>([106.816666, -6.2]);
  const cameraZoomRef = useRef(12);

  // RENDER HELPERS
  const renderSearchResults = () => {
    // FORCE VISIBILITY: Check if we have results
    // Use length check directly to override any subtle false states
    const hasResults = searchResults && searchResults.length > 0;

    if (!hasResults) return null;

    return (
      <View style={styles.searchResultsContainer}>
        <FlashList
          data={searchResults}
          keyExtractor={(item: any) => `${item.type}-${item.id}`}
          renderItem={({ item }: { item: any }) => (
            <TouchableOpacity
              style={styles.searchResultItem}
              onPress={() => handleSearchResultPress(item)}
            >
              <View
                style={[
                  styles.resultIcon,
                  {
                    backgroundColor:
                      MARKER_COLORS[item.type as DeviceType] || "#ccc",
                  },
                ]}
              />
              <View>
                <Text style={styles.resultName}>
                  {item.name || item.nama || item.idPelanggan}
                </Text>
                <Text style={styles.resultType}>
                  {item.type.toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          estimatedItemSize={70}
          style={{ maxHeight: 250 }}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    );
  };

  // Memoize map style to prevent reloads on render
  const mapStyle = useMemo(
    () => ({
      version: 8,
      sources: {
        google_satellite: {
          type: "raster",
          tiles: [
            "https://mt0.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}",
          ],
          tileSize: 256,
          attribution: "© Google Maps",
        },
      },
      layers: [
        {
          id: "google-satellite-tiles",
          type: "raster",
          source: "google_satellite",
          minzoom: 0,
          maxzoom: 22,
        },
      ],
    }),
    [],
  );

  useEffect(() => {
    logger.info("[TopologyMap] Component MOUNTED");
    return () => logger.info("[TopologyMap] Component UNMOUNTED");
  }, []);

  useEffect(() => {
    if (data) {
      const totalDevices =
        (data.otbs?.length || 0) +
        (data.odcs?.length || 0) +
        (data.odps?.length || 0) +
        (data.joinboxes?.length || 0) +
        (data.poles?.length || 0) +
        (data.pelanggans?.length || 0);

      logger.info("[Topology] Total devices loaded:", totalDevices);
    }
  }, [data]);

  // Parse KMZ/KML files when data changes - OPTIMIZED with cache and non-blocking
  useEffect(() => {
    async function loadKmzData() {
      if (!data?.kmzFiles || data.kmzFiles.length === 0) {
        setKmzFeatures([]);
        return;
      }

      logger.info("Loading KMZ files:", data.kmzFiles.length);
      setLoadingKmz(true);

      const allFeatures: GeoJSON.Feature[] = [];

      for (const file of data.kmzFiles) {
        if (!file.kmlPath) continue;

        // Check cache first
        const cacheKey = `${file.id}-${file.kmlPath}`;
        if (kmzCache.current.has(cacheKey)) {
          logger.info(`Using cached KMZ: ${file.name}`);
          allFeatures.push(...kmzCache.current.get(cacheKey)!);
          continue;
        }

        try {
          // Check if path is absolute
          const url = file.kmlPath.startsWith("http")
            ? file.kmlPath
            : `${api.defaults.baseURL}${file.kmlPath.startsWith("/") ? "" : "/"}${file.kmlPath}`;

          logger.info(`Fetching KML from: ${url}`);

          // Use requestAnimationFrame to prevent blocking
          await new Promise((resolve) => requestAnimationFrame(resolve));

          const response = await fetch(url);
          const text = await response.text();

          // Parse in next tick to avoid blocking main thread
          await new Promise((resolve) => setTimeout(resolve, 0));

          const parser = new DOMParser();
          const kmlDom = parser.parseFromString(text, "text/xml");
          const geoJson = toGeoJSON.kml(kmlDom);

          if (geoJson.features) {
            // Add styling properties
            geoJson.features.forEach((feature: GeoJSON.Feature) => {
              if (!feature.properties) feature.properties = {};
              feature.properties.color = file.lineColor || "#6366f1";
              feature.properties.kmzId = file.id;
              feature.properties.sourceFile = file.name;
            });

            // Cache the result
            kmzCache.current.set(cacheKey, geoJson.features as GeoJSON.Feature[]);
            allFeatures.push(...(geoJson.features as GeoJSON.Feature[]));
          }
        } catch (e) {
          logger.error(`Error loading KML ${file.name}:`, e);
        }
      }

      logger.info(`Loaded ${allFeatures.length} KMZ features`);
      setKmzFeatures(allFeatures);
      setLoadingKmz(false);
    }

    if (data) {
      loadKmzData();
    }
  }, [data]);

  const handleMarkerPress = useCallback((device: any, type: DeviceType) => {
    if (device) {
      const enrichedDevice = { ...device };

      // Flatten ODP data for modal
      if (type === "odp") {
        if (device.site?.name) enrichedDevice.siteName = device.site.name;
        if (device._count?.odpOutput !== undefined)
          enrichedDevice.odpOutputCount = device._count.odpOutput;
      }

      setSelectedDevice({ data: enrichedDevice, type: type });
    }
  }, []);

  // Convert data to GeoJSON for ShapeSource - MOVED UP and UPDATED
  const devicesGeoJson = useMemo((): GeoJSON.FeatureCollection => {
    if (!data) return { type: "FeatureCollection", features: [] };

    const features: GeoJSON.Feature[] = [];
    const addFeature = (d: any, type: DeviceType, color: string) => {
      // PERMISIF: Skip hanya jika koordinat null/0
      if (!d.longitude || !d.latitude) return;

      // PERMISIF: Fallback ID jika data.id kosong
      const safeId = d.id ? String(d.id) : `fallback-${type}-${Math.random().toString(36).substr(2, 9)}`;

      features.push({
        type: "Feature",
        id: type + "-" + safeId,
        properties: {
          id: safeId,
          originalId: d.id, // STORE ORIGINAL ID
          type: type,
          color: color || "#9ca3af",
          name: d.name || d.nama || d.idPelanggan || "Tanpa Nama",
          source: "inventory",
          // Map all details for the modal
          notes: d.notes,
          capacity: d.capacity,
          splitter: d.splitter,
          serialNumber: d.serialNumber,
          pppoe: d.pppoe,
          attenuationIn: d.attenuationInput,
          attenuationOut: d.attenuationOutput,
          usedSlots: d.usedSlots,
          inputCoreColor: d.inputCoreColor,
          photo: d.photo,
          parent: d.parent,
        },
        geometry: {
          type: "Point",
          coordinates: [d.longitude, d.latitude],
        },
      });
    };

    if (visibility.otb)
      data.otbs.forEach((d) => addFeature(d, "otb", MARKER_COLORS.otb));
    if (visibility.odc)
      data.odcs.forEach((d) => addFeature(d, "odc", MARKER_COLORS.odc));
    if (visibility.odp)
      data.odps.forEach((d) => addFeature(d, "odp", MARKER_COLORS.odp));
    if (visibility.joinbox)
      data.joinboxes.forEach((d) =>
        addFeature(d, "joinbox", MARKER_COLORS.joinbox),
      );
    if (visibility.pole)
      data.poles.forEach((d) => addFeature(d, "pole", MARKER_COLORS.pole));
    if (visibility.pelanggan)
      data.pelanggans.forEach((d) =>
        addFeature(d, "pelanggan", MARKER_COLORS.pelanggan),
      );

    // Render nodes from MappingNode
    if (data.nodes) {
      data.nodes.forEach((node) => {
        // PERMISIF: Cek koordinat
        if (!node.longitude || !node.latitude) return;

        // PERMISIF: Fallback ID
        const safeId = node.nodeId ? String(node.nodeId) : `node-fallback-${Math.random().toString(36).substr(2, 9)}`;

        let mappedType: DeviceType = "pole"; // Default fallback
        let color = MARKER_COLORS.pole;

        // Map node types to device types and colors
        if (node.type) {
          switch (node.type.toLowerCase()) {
            case "server":
              mappedType = "otb"; // Icon Server, Warna Ungu
              color = MARKER_COLORS.otb;
              break;
            case "odc":
              mappedType = "odc"; // Icon Box, Warna Biru
              color = MARKER_COLORS.odc;
              break;
            case "odp":
              mappedType = "odp"; // Icon Disc, Warna Cyan
              color = MARKER_COLORS.odp;
              break;
            case "ont":
              mappedType = "pelanggan"; // Icon Home, Warna Oranye
              color = MARKER_COLORS.pelanggan;
              break;
          }
        }

        if (mappedType && visibility[mappedType]) {
          features.push({
            type: "Feature",
            id: `node-${safeId}`,
            properties: {
              id: safeId,
              originalId: node.nodeId, // STORE ORIGINAL ID
              type: mappedType,
              color: color,
              name: node.name || "Node Tanpa Nama",
              source: "mapping-node",
              originalType: node.type || "unknown",
              // Map all details for the modal
              notes: node.notes, // Use notes from backend
              description: node.description, // Fallback
              capacity: node.capacity,
              splitter: node.splitter,
              serialNumber: node.serialNumber, // Note: node.serialNumber (camelCase)
              pppoe: node.pppoe,
              attenuationIn: node.attenuationIn,
              attenuationOut: node.attenuationOut,
              usedSlots: node.usedSlots,
              inputCoreColor: node.inputCoreColor,
              photo: node.photo,
              parent: node.parent,
            },
            geometry: {
              type: "Point",
              coordinates: [node.longitude, node.latitude],
            },
          });
        }
      });
    }

    return { type: "FeatureCollection", features };
  }, [data, visibility]);

  // Connection lines GeoJSON - UPDATED LOGIC
  const connectionLines = useMemo((): GeoJSON.FeatureCollection => {
    if (!data || !data.edges) return { type: "FeatureCollection", features: [] };

    const features: GeoJSON.Feature[] = [];

    // Use visible features for lookup to ensure we only connect to valid/visible nodes
    const allFeatures = devicesGeoJson.features;

    if (!visibility.lines) return { type: "FeatureCollection", features: [] };

    data.edges.forEach((edge, index) => {
      if (!edge) return;

      // 1. Loose ID Comparison (String vs String)
      // Fix: Gunakan String() untuk membandingkan ID karena bisa berupa number/string dari DB
      const sourceIdStr = String(edge.source);
      const targetIdStr = String(edge.target);

      // Find source and target features by their ORIGINAL ID
      const sourceFeature = allFeatures.find(f => String(f.properties?.originalId) === sourceIdStr);
      const targetFeature = allFeatures.find(f => String(f.properties?.originalId) === targetIdStr);

      // 4. Safety Check: Jika node tidak ketemu (mungkin terfilter atau data corrupt), skip garis ini
      if (!sourceFeature || !targetFeature) {
        return;
      }

      const sourceCoords = (sourceFeature.geometry as any).coordinates;
      const targetCoords = (targetFeature.geometry as any).coordinates;

      if (sourceCoords && targetCoords) {
        let coordinates: number[][] = [];

        // Start with Source
        coordinates.push(sourceCoords);

        // 1. Handle JSON String Waypoints (Robust Parsing)
        let waypoints = edge.waypoints;

        // Cek apakah string (JSON String dari DB)
        if (typeof waypoints === 'string') {
          try {
            waypoints = JSON.parse(waypoints);
          } catch (e) {
            logger.error(`Failed to parse waypoints for edge ${edge.id || 'unknown'}:`, e);
            waypoints = [];
          }
        }

        // Add Waypoints (if any)
        if (waypoints && Array.isArray(waypoints)) {
          const wps = waypoints.map((wp: any) => {
            let lng, lat;

            if (Array.isArray(wp)) {
              // 3. Koordinat GeoJSON: Pastikan [Longitude, Latitude]
              // Heuristic: Jika format [Lat, Lng], maka Lng (biasanya >90 di Indo) ada di index 1
              const val0 = Number(wp[0]);
              const val1 = Number(wp[1]);

              // Deteksi format [Lat, Lng] -> Swap jadi [Lng, Lat]
              // Asumsi: Longitude Indonesia ~95-141, Latitude ~-11 s/d +6
              if (Math.abs(val1) > Math.abs(val0) && Math.abs(val1) > 90) {
                lng = val1;
                lat = val0;
              } else {
                // Format standard [Lng, Lat]
                lng = val0;
                lat = val1;
              }
            } else {
              // Handle object case if mixed
              lng = wp.longitude ?? wp.lng ?? 0;
              lat = wp.latitude ?? wp.lat ?? 0;
            }
            return [Number(lng), Number(lat)];
          });
          coordinates.push(...wps);
        }

        // End with Target
        coordinates.push(targetCoords);

        // Determine line color from feature types
        const sourceType = sourceFeature.properties?.type;
        const targetType = targetFeature.properties?.type;
        const color = getLineColor(sourceType, targetType, edge.color);

        // Calculate distance for info
        const distance = calculateDistance(
          sourceCoords[1],
          sourceCoords[0],
          targetCoords[1],
          targetCoords[0]
        );

        features.push({
          type: "Feature",
          properties: {
            color: color,
            sourceName: sourceFeature.properties?.name || "Unknown",
            targetName: targetFeature.properties?.name || "Unknown",
            distance: `${distance}m`
          },
          geometry: {
            type: "LineString",
            coordinates: coordinates,
          },
        });
      }
    });

    return { type: "FeatureCollection", features };
  }, [data, visibility, devicesGeoJson]);

  // KMZ GeoJSON
  const kmzGeoJson = useMemo(() => {
    if (!visibility.kmz || !kmzFeatures || kmzFeatures.length === 0) {
      return { type: "FeatureCollection", features: [] };
    }
    return { type: "FeatureCollection", features: kmzFeatures };
  }, [visibility.kmz, kmzFeatures]);

  const onLineSelected = useCallback((event: any) => {
    const feature = event.features[0];
    if (!feature) return;

    const { sourceName, targetName, distance } = feature.properties;
    Alert.alert(
      "Info Jalur Kabel",
      `Dari: ${sourceName}\nKe: ${targetName}\nJarak Estimasi: ${distance || "?"}`,
      [{ text: "Tutup" }]
    );
  }, []);

  const onAnnotationSelected = useCallback((feature: GeoJSON.Feature) => {
    const {
      id,
      type,
      source,
      description,
      name,
      originalId,
      // Destructure new fields
      notes,
      capacity,
      splitter,
      serialNumber,
      pppoe,
      attenuationIn,
      attenuationOut,
      usedSlots,
      inputCoreColor,
      photo,
      parent // Destructure parent
    } = feature.properties as any;
    logger.info("Device annotation selected:", type, id, source, "Original ID:", originalId);

    if (source === "mapping-node") {
      // Handle MappingNode selection
      const deviceData: DeviceData = {
        id: id,
        name: name,
        latitude: (feature.geometry as any).coordinates[1],
        longitude: (feature.geometry as any).coordinates[0],
        notes: notes || description, // prioritize notes
        capacity,
        splitter,
        serialNumber,
        pppoe,
        attenuationInput: attenuationIn,
        attenuationOutput: attenuationOut,
        usedSlots,
        inputCoreColor,
        images: photo ? [photo] : undefined, // Map photo string to images array
        parent, // Pass parent object
      };

      handleMarkerPress(deviceData, type);
      return;
    }

    // Find original data object
    let deviceData: DeviceData | null = null;
    if (data) {
      // Use helper to match ID safely (handles string vs number)
      // Prioritize originalId if available, otherwise fallback to id from properties
      const targetId = originalId !== undefined ? String(originalId) : String(id);

      const matchesId = (d: any) => String(d.id) === targetId;

      switch (type) {
        case "otb":
          const otb = data.otbs.find(matchesId);
          if (otb) deviceData = otb as unknown as DeviceData;
          break;
        case "odc":
          const odc = data.odcs.find(matchesId);
          if (odc) deviceData = odc as unknown as DeviceData;
          break;
        case "odp":
          const odp = data.odps.find(matchesId);
          if (odp) deviceData = odp as unknown as DeviceData;
          break;
        case "joinbox":
          const joinbox = data.joinboxes.find(matchesId);
          if (joinbox) deviceData = joinbox as unknown as DeviceData;
          break;
        case "pole":
          const pole = data.poles.find(matchesId);
          if (pole) deviceData = pole as unknown as DeviceData;
          break;
        case "pelanggan":
          const pelanggan = data.pelanggans.find(matchesId);
          if (pelanggan) deviceData = pelanggan as unknown as DeviceData;
          break;
      }
    }

    if (deviceData) {
      // Merge extra properties from feature if they exist in feature properties
      // This ensures that even if 'data' array item is missing something, 
      // but 'feature.properties' has it (via addFeature), we preserve it.
      deviceData = {
        ...deviceData,
        capacity: deviceData.capacity ?? capacity,
        splitter: deviceData.splitter ?? splitter,
        serialNumber: deviceData.serialNumber ?? serialNumber,
        pppoe: deviceData.pppoe ?? pppoe,
        attenuationInput: deviceData.attenuationInput ?? attenuationIn,
        attenuationOutput: deviceData.attenuationOutput ?? attenuationOut,
        usedSlots: deviceData.usedSlots ?? usedSlots,
        inputCoreColor: deviceData.inputCoreColor ?? inputCoreColor,
        parent: deviceData.parent ?? parent,
        notes: deviceData.notes ?? notes,
        photo: deviceData.photo ?? photo,
      };

      handleMarkerPress(deviceData, type);
    }
  }, [data, handleMarkerPress]);

  // Counts for filter panel
  const counts = useMemo(() => {
    if (!data)
      return {
        otb: 0,
        odc: 0,
        odp: 0,
        joinbox: 0,
        pole: 0,
        pelanggan: 0,
        kmz: 0,
        lines: 0,
      };
    return {
      otb: data.otbs.length,
      otbs: data.otbs.length, // Alias
      odc: data.odcs.length,
      odcs: data.odcs.length, // Alias
      odp: data.odps.length,
      odps: data.odps.length, // Alias
      joinbox: data.joinboxes.length,
      joinboxes: data.joinboxes.length, // Alias
      pole: data.poles.length,
      poles: data.poles.length, // Alias
      pelanggan: data.pelanggans.length,
      pelanggans: data.pelanggans.length, // Alias
      kmz: data.kmzFiles?.length || 0,
      lines: data.edges?.length || 0,
    };
  }, [data]);

  const handleToggleVisibility = useCallback((type: DeviceType | 'lines') => {
    setVisibility((prev) => ({ ...prev, [type]: !prev[type] }));
  }, []);

  const handleCameraChange = useCallback((payload: any) => {
    // Update zoom level (using ref to prevent re-renders)
    const zoomLevel = payload?.properties?.zoom;
    if (zoomLevel !== undefined) {
      zoomRef.current = zoomLevel;
      cameraZoomRef.current = zoomLevel; // Keep Camera prop in sync
    }

    // Update center for picker (using ref to prevent re-renders)
    const geometry = payload?.geometry as GeoJSON.Point;
    const center = geometry?.coordinates as [number, number];
    if (center) {
      cameraCenterRef.current = center; // Keep Camera prop in sync
    }

    // Update viewport bounds (using ref to prevent re-renders)
    const bounds = payload?.properties?.bounds as { ne: [number, number]; sw: [number, number] } | undefined;
    if (bounds) {
      viewportRef.current = {
        north: bounds.ne[1],
        south: bounds.sw[1],
        east: bounds.ne[0],
        west: bounds.sw[0],
      };
    }
  }, []);

  const handleMapLongPress = useCallback((feature: any) => {
    const coords = feature.geometry.coordinates;
    if (coords) {
      setCreateLocation({
        longitude: coords[0],
        latitude: coords[1],
      });
      setCreateModalVisible(true);
    }
  }, []);

  // Memoize style loading callback to prevent recreating on every render
  const handleStyleLoaded = useCallback(() => {
    logger.info("[TopologyMap] Style finished loading");
    setMapReady(true);
  }, []);

  const [mapReady, setMapReady] = useState(false); // Track map readiness

  // Calculate proper map bounds and center coordinate from all devices
  const mapBounds = useMemo(() => {
    if (!data) return null;

    // Collect all coordinates from all device types (not just OTBs)
    const allCoords = [
      ...data.otbs.map((d) => [d.longitude, d.latitude]),
      ...data.odcs.map((d) => [d.longitude, d.latitude]),
      ...data.odps.map((d) => [d.longitude, d.latitude]),
      ...data.joinboxes.map((d) => [d.longitude, d.latitude]),
      ...data.poles.map((d) => [d.longitude, d.latitude]),
      ...data.pelanggans.map((d) => [d.longitude, d.latitude]),
      ...(data.nodes || []).map((d) => [d.longitude, d.latitude]),
    ];

    if (allCoords.length === 0) return null;

    const lons = allCoords.map((c) => c[0]);
    const lats = allCoords.map((c) => c[1]);

    return {
      center: [
        (Math.min(...lons) + Math.max(...lons)) / 2,
        (Math.min(...lats) + Math.max(...lats)) / 2,
      ] as [number, number],
      bounds: {
        ne: [Math.max(...lons), Math.max(...lats)] as [number, number],
        sw: [Math.min(...lons), Math.min(...lats)] as [number, number],
      },
    };
  }, [data]);

  // Auto-center camera to data bounds when data is loaded
  useEffect(() => {
    if (mapReady && mapBounds && cameraRef.current) {
      logger.info(
        "[TopologyMap] Auto-centering to data bounds:",
        mapBounds.center,
      );
      cameraRef.current.setCamera({
        centerCoordinate: mapBounds.center,
        zoomLevel: 14, // Zoom closer to see markers
        animationDuration: 1000,
      });
    }
  }, [mapReady, mapBounds]);

  const renderPoints = () => {
    return devicesGeoJson.features.map((feature) => {
      const props = feature.properties as any;
      const coords = (feature.geometry as any).coordinates;

      // PERMISIF: Pastikan selalu render meski ID asli kosong
      const safeId = props.id || `render-${Math.random().toString(36).substr(2, 9)}`;
      const elementKey = `${props.source || "inventory"}-${props.type}-${safeId}`;

      return (
        <MapLibreGL.MarkerView
          key={elementKey}
          coordinate={coords}
        >
          <TouchableOpacity
            onPress={() => onAnnotationSelected(feature)}
            activeOpacity={0.8}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: props.color,
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 2,
              borderColor: "white",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
              zIndex: 10,
            }}
          >
            {getDeviceIcon(props.type, 16, "white")}
          </TouchableOpacity>
        </MapLibreGL.MarkerView>
      );
    });
  };

  if (loading && !data) {
    return <TopologySkeleton />;
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchData()}>
          <RefreshCw size={20} color="#fff" />
          <Text style={styles.retryButtonText}>Coba Lagi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TopologyErrorBoundary>
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Topology Map</Text>
          <TouchableOpacity
            style={styles.filterToggle}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Layers size={24} color={showFilters ? "#3b82f6" : "#6b7280"} />
          </TouchableOpacity>
        </View>

        {/* Map Container with Relative Positioning for Overlays */}
        <View style={styles.mapContainer}>
          {/* Map Content - Using mapStyle prop (v10+) */}
          <MapLibreGL.MapView
            key="topology-map-view"
            style={styles.map}
            mapStyle={mapStyle}
            logoEnabled={false}
            attributionEnabled={false}
            onRegionDidChange={handleCameraChange}
            onDidFinishLoadingStyle={handleStyleLoaded}
            onLongPress={handleMapLongPress}
          >
            <MapLibreGL.Camera
              ref={cameraRef}
              followUserLocation={false}
              defaultSettings={{
                centerCoordinate: [106.816666, -6.2], // Jakarta, Indonesia
                zoomLevel: 10, // Reasonable zoom to see the area
              }}
            />

            {/* Connection Lines (GeoJSON) - Animated */}
            <AnimatedConnectionLines
              shape={connectionLines}
              onLineSelected={onLineSelected}
            />

            {/* KMZ/KML Layers */}
            <MapLibreGL.ShapeSource id="kmzSource" shape={kmzGeoJson as any}>
              <MapLibreGL.LineLayer
                id="kmzLineLayer"
                // Place KMZ lines above regular connection lines
                aboveLayerID="linesLayer"
                style={{
                  lineColor: ["get", "color"],
                  lineWidth: 3,
                  lineOpacity: 0.8,
                }}
              />
            </MapLibreGL.ShapeSource>

            {/* DEVICE MARKERS (MarkerView) */}
            {renderPoints()}
          </MapLibreGL.MapView>

          {/* Search Bar (Moved inside Map Container) */}
          <View style={styles.searchContainer}>
            <View style={styles.searchWrapper}>
              <Search size={20} color="#6b7280" />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari perangkat (ODP, ODC, Server, Pelanggan)..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#9ca3af"
              />
              {searchQuery.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <X size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* KMZ Loading Indicator */}
          {loadingKmz && (
            <View style={styles.kmzLoading}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={styles.kmzLoadingText}>Memuat KMZ...</Text>
            </View>
          )}

          {/* RENDER SEARCH RESULTS INSIDE CONTAINER TO POSITION CORRECTLY */}
          {renderSearchResults()}

          {/* Filter Panel */}
          {showFilters && (
            <FilterPanel
              visibility={visibility}
              onToggle={handleToggleVisibility}
              counts={counts}
            />
          )}
        </View>

        {/* Device Detail Modal */}
        <DeviceDetailModal
          visible={selectedDevice !== null}
          onClose={() => setSelectedDevice(null)}
          device={selectedDevice?.data || null}
          deviceType={selectedDevice?.type || null}
        />

        {/* Device Create Modal */}
        <DeviceCreateModal
          visible={createModalVisible}
          onClose={() => setCreateModalVisible(false)}
          initialLocation={createLocation}
          onSuccess={() => {
            fetchData();
            setCreateModalVisible(false);
          }}
        />
      </SafeAreaView>
    </TopologyErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    zIndex: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  filterToggle: {
    padding: 8,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6b7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: "#dc2626",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3b82f6",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  marker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  markerInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "white",
  },
  kmzLoading: {
    position: "absolute",
    top: 80,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 5,
  },
  searchContainer: {
    position: "absolute",
    top: 16, // Reduced from 60 to remove gap
    left: 16,
    right: 16,
    zIndex: 100,
    elevation: 10,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#374151",
    height: 40,
  },
  searchResultsContainer: {
    position: "absolute",
    top: 70, // Adjusted to be just below searchContainer (16 + height ~50 + margin)
    left: 16,
    right: 16,
    zIndex: 9999, // FORCE MAX Z-INDEX
    elevation: 9999,
    backgroundColor: "white",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    maxHeight: 300,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  resultIcon: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  resultName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
  },
  resultType: {
    fontSize: 12,
    color: "#6b7280",
  },
  kmzLoadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#6b7280",
  },
});
