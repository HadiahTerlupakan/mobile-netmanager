import { TopologySkeleton } from "@/components/molecules/TopologySkeleton";
import { useAuth } from "@/context/AuthContext";
import { useApiQuery } from "@/hooks/queries";
import { useUserLocationWatcher } from "@/hooks/useUserLocationWatcher";
import api from "@/services/api";
import { getUserFriendlyError } from "@/utils/errorHandling";
import { logger } from "@/utils/logger";
import { getMapLibre, isMapLibreAvailable, isWeb } from "@/utils/maplibre";
import toGeoJSON from "@/utils/togeojson-wrapper";
import { FlashList } from "@shopify/flash-list";
import { useIsFocused } from "@react-navigation/native";
import { DOMParser } from "@xmldom/xmldom";
import { useRouter } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  List,
  LocateFixed,
  MapPin,
  RefreshCw,
  Search,
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
  FlatList,
  Keyboard,
  Modal,
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
import { TopologyErrorBoundary } from "@/components/organisms/topology/TopologyErrorBoundary";
import { WebMapView } from "@/components/organisms/topology/WebMapView";
import tw from "twrnc";
import { useFeatureGuard } from '@/hooks/useFeatureGuard';
import { AppFeature } from '@/constants/features';
// Helper & tipe murni layar topology diekstrak ke modul topology.
import {
  GeoJSONFeature,
  GeoJSONFeatureCollection,
  MARKER_COLORS,
  buildConnectionLines,
  buildDevicesGeoJson,
  getDeviceIcon,
} from "@/components/organisms/topology/topologyHelpers";
import {
  TopologyData,
  VisibilityState,
} from "@/components/organisms/topology/topologyTypes";

// Get MapLibre (will be null in Expo Go)
const MapLibreGL = getMapLibre();

// Semua layer peta selalu tampil. Panel filter layer sudah diganti modal
// daftar perangkat, jadi tidak ada lagi yang mengubah nilai ini.
const ALL_LAYERS_VISIBLE: VisibilityState = {
  otb: true,
  odc: true,
  odp: true,
  pole: true,
  joinbox: true,
  pelanggan: true,
  kmz: true,
  lines: true,
};

// MapLibre Config (only if available)
if (MapLibreGL) {
  MapLibreGL.setAccessToken(null); // Not needed for open tiles

  // Suppress MapLibre HTTP errors for empty URLs
  MapLibreGL.Logger.setLogCallback((log: any) => {
    const { message } = log;
    // Ignore empty resourceUrl errors
    if (message?.includes("Unable to parse resourceUrl")) {
      return true; // Suppress this log
    }
    return false; // Let other logs through
  });
}

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
  useFeatureGuard(AppFeature.TOPOLOGY);

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

  const error = useMemo(() => {
    if (!queryError) return null;
    const { message } = getUserFriendlyError(queryError);
    return message;
  }, [queryError]);

  // Use refs instead of state for camera tracking to prevent re-renders
  const zoomRef = useRef(12);
  const [loadingKmz, setLoadingKmz] = useState(false); // Track KMZ loading state
  const viewportRef = useRef<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);

  const [kmzFeatures, setKmzFeatures] = useState<GeoJSONFeature[]>([]);
  const kmzCache = useRef<Map<string, GeoJSONFeature[]>>(new Map()); // Cache for processed KMZ files
  const cameraRef = useRef<any>(null);
  const userLocation = useUserLocationWatcher();
  const isFocused = useIsFocused();

  const [selectedDevice, setSelectedDevice] = useState<{
    data: DeviceData;
    type: DeviceType;
  } | null>(null);

  const [showDeviceList, setShowDeviceList] = useState(false);
  const [listQuery, setListQuery] = useState("");

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

  const cameraCenterRef = useRef<[number, number]>([106.816666, -6.2]);
  const cameraZoomRef = useRef(12);
  const [initialCamera, setInitialCamera] = useState<{
    centerCoordinate: [number, number];
    zoomLevel: number;
  } | null>(null);

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

      const allFeatures: GeoJSONFeature[] = [];

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
          // Fetch KML string, handling absolute vs relative paths
          let text: string;
          const isAbsolute = file.kmlPath.startsWith("http");
          const url = isAbsolute
            ? file.kmlPath
            : `${api.defaults.baseURL || ''}${file.kmlPath.startsWith("/") ? "" : "/"}${file.kmlPath}`;

          logger.info(`Fetching KML from: ${url}`);

          // Use requestAnimationFrame to prevent blocking
          await new Promise((resolve) => requestAnimationFrame(resolve));

          if (isAbsolute) {
            const response = await fetch(url);
            text = await response.text();
          } else {
            // Gunakan `api.get` agar token dikirim di header untuk file internal/private
            const response = await api.get(file.kmlPath, { responseType: 'text' });
            text = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
          }

          // Parse in next tick to avoid blocking main thread
          await new Promise((resolve) => setTimeout(resolve, 0));

          const parser = new DOMParser();
          const kmlDom = parser.parseFromString(text, "text/xml");
          const geoJson = toGeoJSON.kml(kmlDom);

          if (geoJson.features) {
            // Add styling properties
            geoJson.features.forEach((feature: GeoJSONFeature) => {
              if (!feature.properties) feature.properties = {};
              feature.properties.color = file.lineColor || "#6366f1";
              feature.properties.kmzId = file.id;
              feature.properties.sourceFile = file.name;
            });

            // Cache the result
            kmzCache.current.set(cacheKey, geoJson.features as GeoJSONFeature[]);
            allFeatures.push(...(geoJson.features as GeoJSONFeature[]));
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

  // Convert data to GeoJSON for ShapeSource (builder murni di topologyHelpers)
  const devicesGeoJson = useMemo(
    (): GeoJSONFeatureCollection => buildDevicesGeoJson(data, ALL_LAYERS_VISIBLE),
    [data],
  );

  // Connection lines GeoJSON (builder murni di topologyHelpers)
  const connectionLines = useMemo(
    (): GeoJSONFeatureCollection =>
      buildConnectionLines(data, devicesGeoJson.features, ALL_LAYERS_VISIBLE.lines),
    [data, devicesGeoJson],
  );

  // KMZ GeoJSON
  const kmzGeoJson = useMemo(() => {
    if (!kmzFeatures || kmzFeatures.length === 0) {
      return { type: "FeatureCollection", features: [] };
    }
    return { type: "FeatureCollection", features: kmzFeatures };
  }, [kmzFeatures]);

  const onLineSelected = useCallback((event: any) => {
    const feature = event.features[0];
    if (!feature) return;

    const { sourceName, targetName, distance } = feature.properties;
    Alert.alert(
      "Info Jalur Kabel",
      `Dari: ${sourceName}\nKe: ${targetName}\nJarak Estimasi: ${distance || "?"}`,
      [{ text: "Tutup" }],
    );
  }, []);

  const onAnnotationSelected = useCallback((feature: GeoJSONFeature) => {
    const props = (feature.properties || {}) as any;
    const type = (props.type || "pole") as DeviceType;
    const coords = (feature.geometry as any)?.coordinates || [0, 0];
    const targetId =
      props.originalId !== undefined && props.originalId !== null
        ? String(props.originalId)
        : String(props.id ?? "");

    let deviceData: DeviceData | null = null;
    if (data && targetId) {
      const matchesId = (d: any) =>
        String(d.id) === targetId || String(d.nodeId) === targetId;

      if (type === "otb") deviceData = (data.otbs.find(matchesId) as any) ?? null;
      else if (type === "odc") deviceData = (data.odcs.find(matchesId) as any) ?? null;
      else if (type === "odp") deviceData = (data.odps.find(matchesId) as any) ?? null;
      else if (type === "joinbox")
        deviceData = (data.joinboxes.find(matchesId) as any) ?? null;
      else if (type === "pole") deviceData = (data.poles.find(matchesId) as any) ?? null;
      else if (type === "pelanggan")
        deviceData = (data.pelanggans.find(matchesId) as any) ?? null;

      if (!deviceData && data.nodes) {
        const node = data.nodes.find(
          (n) => String(n.nodeId) === targetId || String(n.nodeId) === String(props.id),
        );
        if (node) {
          deviceData = {
            id: String(node.nodeId),
            name: node.name,
            latitude: node.latitude,
            longitude: node.longitude,
            notes: node.notes || node.description,
            capacity: node.capacity,
            splitter: node.splitter,
            serialNumber: node.serialNumber,
            pppoe: node.pppoe,
            attenuationInput: node.attenuationIn,
            attenuationOutput: node.attenuationOut,
            usedSlots: node.usedSlots,
            inputCoreColor: node.inputCoreColor,
            images: node.photo ? [node.photo] : undefined,
            parent: node.parent,
          };
        }
      }
    }

    const fallback: DeviceData = {
      id: targetId || String(props.id || "unknown"),
      name: props.name || props.nama || props.idPelanggan || "Perangkat",
      latitude: Number(coords[1]) || 0,
      longitude: Number(coords[0]) || 0,
      notes: props.notes || props.description,
      capacity: props.capacity,
      splitter: props.splitter,
      serialNumber: props.serialNumber,
      pppoe: props.pppoe,
      attenuationInput: props.attenuationIn,
      attenuationOutput: props.attenuationOut,
      usedSlots: props.usedSlots,
      inputCoreColor: props.inputCoreColor,
      images: props.photo ? [props.photo] : undefined,
      parent: props.parent,
    };

    handleMarkerPress(
      deviceData
        ? {
            ...deviceData,
            capacity: deviceData.capacity ?? props.capacity,
            splitter: deviceData.splitter ?? props.splitter,
            serialNumber: deviceData.serialNumber ?? props.serialNumber,
            pppoe: deviceData.pppoe ?? props.pppoe,
            attenuationInput: deviceData.attenuationInput ?? props.attenuationIn,
            attenuationOutput:
              deviceData.attenuationOutput ?? props.attenuationOut,
            usedSlots: deviceData.usedSlots ?? props.usedSlots,
            inputCoreColor: deviceData.inputCoreColor ?? props.inputCoreColor,
            parent: deviceData.parent ?? props.parent,
            notes: deviceData.notes ?? props.notes,
            photo: deviceData.photo ?? props.photo,
          }
        : fallback,
      type,
    );
  }, [data, handleMarkerPress]);

  const handleCameraChange = useCallback((payload: any) => {
    // Update zoom level (using ref to prevent re-renders)
    const zoomLevel = payload?.properties?.zoom;
    if (zoomLevel !== undefined) {
      zoomRef.current = zoomLevel;
      cameraZoomRef.current = zoomLevel; // Keep Camera prop in sync
    }

    // Update center for picker (using ref to prevent re-renders)
    const geometry = payload?.geometry as { type: string; coordinates: [number, number] };
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

  // Memoize style loading callback to prevent recreating on every render
  const mapBounds = useMemo(() => {
    if (!data) return null;

    const allCoords = [
      ...data.otbs.map((d) => [d.longitude, d.latitude]),
      ...data.odcs.map((d) => [d.longitude, d.latitude]),
      ...data.odps.map((d) => [d.longitude, d.latitude]),
      ...data.joinboxes.map((d) => [d.longitude, d.latitude]),
      ...data.poles.map((d) => [d.longitude, d.latitude]),
      ...data.pelanggans.map((d) => [d.longitude, d.latitude]),
      ...(data.nodes || []).map((d) => [d.longitude, d.latitude]),
    ].filter(
      ([lon, lat]) =>
        typeof lon === "number" &&
        typeof lat === "number" &&
        lon >= 95 &&
        lon <= 141 &&
        lat >= -11 &&
        lat <= 6,
    );

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

  useEffect(() => {
    if (initialCamera) return;
    if (userLocation) {
      setInitialCamera({
        centerCoordinate: userLocation,
        zoomLevel: 16,
      });
      return;
    }
    if (mapBounds) {
      setInitialCamera({
        centerCoordinate: mapBounds.center,
        zoomLevel: 14,
      });
    }
  }, [userLocation, mapBounds, initialCamera]);

  const flyToCoordinate = useCallback((longitude: number, latitude: number, zoom = 17) => {
    if (!cameraRef.current) return;
    cameraRef.current.setCamera({
      centerCoordinate: [Number(longitude), Number(latitude)],
      zoomLevel: zoom,
      animationDuration: 800,
    });
  }, []);

  const centerOnUser = useCallback(() => {
    if (!userLocation || !cameraRef.current) return;
    cameraRef.current.setCamera({
      centerCoordinate: userLocation,
      zoomLevel: 16,
      animationDuration: 800,
    });
  }, [userLocation]);

  const deviceListItems = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    return allDevices
      .filter((d) => {
        if (!d.latitude || !d.longitude) return false;
        if (!q) return true;
        const name = String(d.name || d.nama || d.idPelanggan || "").toLowerCase();
        const type = String(d.type || "").toLowerCase();
        return name.includes(q) || type.includes(q);
      })
      .slice(0, 200);
  }, [allDevices, listQuery]);

  const handleDeviceListPress = useCallback(
    (item: any) => {
      setShowDeviceList(false);
      setListQuery("");
      Keyboard.dismiss();
      if (item.latitude && item.longitude) {
        flyToCoordinate(Number(item.longitude), Number(item.latitude), 18);
      }
      handleMarkerPress(item, item.type as DeviceType);
    },
    [flyToCoordinate, handleMarkerPress],
  );

  const onDeviceShapePress = useCallback(
    (event: any) => {
      const feature = event?.features?.[0];
      if (!feature) return;
      const coords = (feature.geometry as any)?.coordinates;
      if (Array.isArray(coords) && coords.length >= 2) {
        flyToCoordinate(Number(coords[0]), Number(coords[1]), 18);
      }
      onAnnotationSelected(feature as GeoJSONFeature);
    },
    [onAnnotationSelected, flyToCoordinate],
  );

  // Prepare data for WebMapView
  const webDevices = useMemo(() => {
    if (!data) return [];
    const devices: any[] = [];

    const addDevice = (d: any, type: DeviceType) => {
      if (!d.longitude || !d.latitude) return;
      devices.push({
        type,
        id: d.id || d.nodeId,
        name: d.name || d.nama || d.idPelanggan || 'Unknown',
        latitude: d.latitude,
        longitude: d.longitude,
        color: MARKER_COLORS[type],
        properties: d,
      });
    };

    data.otbs.forEach(d => addDevice(d, 'otb'));
    data.odcs.forEach(d => addDevice(d, 'odc'));
    data.odps.forEach(d => addDevice(d, 'odp'));
    data.joinboxes.forEach(d => addDevice(d, 'joinbox'));
    data.poles.forEach(d => addDevice(d, 'pole'));
    data.pelanggans.forEach(d => addDevice(d, 'pelanggan'));

    // Add nodes
    if (data.nodes) {
      data.nodes.forEach(node => {
        let mappedType: DeviceType = 'pole';
        if (node.type) {
          switch (node.type.toLowerCase()) {
            case 'server': mappedType = 'otb'; break;
            case 'odc': mappedType = 'odc'; break;
            case 'odp': mappedType = 'odp'; break;
            case 'ont': mappedType = 'pelanggan'; break;
          }
        }
        addDevice({ ...node, id: node.nodeId }, mappedType);
      });
    }

    return devices;
  }, [data]);

  const webLines = useMemo(() => {
    if (!data || !data.edges) return [];
    return data.edges.map(edge => {
      const sourceDevice = webDevices.find(d => String(d.id) === String(edge.source));
      const targetDevice = webDevices.find(d => String(d.id) === String(edge.target));

      if (!sourceDevice || !targetDevice) return null;

      const coordinates: [number, number][] = [
        [sourceDevice.longitude, sourceDevice.latitude],
      ];

      // Add waypoints if present
      let waypoints = edge.waypoints;
      if (typeof waypoints === 'string') {
        try {
          waypoints = JSON.parse(waypoints);
        } catch {
          waypoints = [];
        }
      }
      if (Array.isArray(waypoints)) {
        waypoints.forEach((wp: any) => {
          if (Array.isArray(wp)) {
            coordinates.push([wp[0], wp[1]]);
          }
        });
      }

      coordinates.push([targetDevice.longitude, targetDevice.latitude]);

      return {
        id: edge.id,
        coordinates,
        color: edge.color || '#FF0000',
        sourceName: sourceDevice.name,
        targetName: targetDevice.name,
      };
    }).filter(Boolean) as any[];
  }, [data, webDevices]);

  const handleWebDevicePress = useCallback((device: any) => {
    setSelectedDevice({
      data: device.properties as DeviceData,
      type: device.type as DeviceType,
    });
  }, []);

  // Show WebMapView for web platform
  if (isWeb) {
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
              onPress={() => setShowDeviceList(true)}
              accessibilityRole="button"
              accessibilityLabel="Daftar perangkat"
            >
              <List size={24} color={showDeviceList ? "#3b82f6" : "#6b7280"} />
            </TouchableOpacity>
          </View>

          {/* Web Map Container */}
          <View style={styles.mapContainer}>
            <WebMapView
              devices={webDevices}
              lines={webLines}
              visibility={ALL_LAYERS_VISIBLE}
              onDevicePress={handleWebDevicePress}
              onRefresh={() => fetchData()}
              loading={loading}
            />
          </View>

          {/* Device Detail Modal */}
          <DeviceDetailModal
            visible={selectedDevice !== null}
            onClose={() => setSelectedDevice(null)}
            device={selectedDevice?.data || null}
            deviceType={selectedDevice?.type || null}
          />
        </SafeAreaView>
      </TopologyErrorBoundary>
    );
  }

  // Show fallback for Expo Go (native only, not web)
  if (!isMapLibreAvailable || !MapLibreGL) {
    return (
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
          <View style={{ width: 40 }} />
        </View>

        {/* Expo Go Fallback Message */}
        <View style={tw`flex-1 items-center justify-center px-8 bg-gray-50`}>
          <AlertTriangle size={64} color="#f59e0b" />
          <Text style={tw`text-xl font-bold text-gray-900 mt-6 text-center`}>
            Fitur Peta Tidak Tersedia
          </Text>
          <Text style={tw`text-gray-600 mt-4 text-center leading-6`}>
            Topology Map membutuhkan development build karena menggunakan MapLibre.
            Saat ini Anda menggunakan Expo Go yang tidak mendukung native module ini.
          </Text>
          <Text style={tw`text-sm text-gray-500 mt-6 text-center`}>
            Jalankan `npx expo run:android` atau `npx expo run:ios` untuk menggunakan fitur ini.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={tw`mt-8 bg-blue-600 px-8 py-4 rounded-xl`}
          >
            <Text style={tw`text-white font-bold`}>Kembali</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
            onPress={() => setShowDeviceList(true)}
            accessibilityRole="button"
            accessibilityLabel="Daftar perangkat"
          >
            <List size={24} color={showDeviceList ? "#3b82f6" : "#6b7280"} />
          </TouchableOpacity>
        </View>

        {/* Map Container with Relative Positioning for Overlays */}
        <View style={styles.mapContainer}>
          {initialCamera ? (
          <MapLibreGL.MapView
            style={styles.map}
            mapStyle={mapStyle}
            logoEnabled={false}
            attributionEnabled={false}
            onRegionDidChange={handleCameraChange}
          >
            <MapLibreGL.Camera
              ref={cameraRef}
              followUserLocation={false}
              minZoomLevel={5}
              maxZoomLevel={20}
              defaultSettings={initialCamera}
            />

            {/* UserLocation menyalakan GPS native MapLibre selama ter-mount, dan
                layar tab ini tetap ter-mount setelah ditinggalkan. */}
            {isMapLibreAvailable && isFocused && userLocation ? (
              <MapLibreGL.UserLocation
                visible={true}
                animated={false}
                showsUserHeadingIndicator={false}
              />
            ) : null}

            <AnimatedConnectionLines
              shape={connectionLines}
              onLineSelected={onLineSelected}
            />

            <MapLibreGL.ShapeSource id="kmzSource" shape={kmzGeoJson as any}>
              <MapLibreGL.LineLayer
                id="kmzLineLayer"
                style={{
                  lineColor: ["get", "color"],
                  lineWidth: 3,
                  lineOpacity: 0.8,
                }}
              />
            </MapLibreGL.ShapeSource>

            <MapLibreGL.ShapeSource
              id="devicesSource"
              shape={devicesGeoJson as any}
              onPress={onDeviceShapePress}
              hitbox={{ width: 36, height: 36 }}
            >
              <MapLibreGL.CircleLayer
                id="devicesCircleLayer"
                style={{
                  circleRadius: 8,
                  circleColor: ["get", "color"],
                  circleStrokeWidth: 2,
                  circleStrokeColor: "#ffffff",
                  circleOpacity: 0.95,
                  circlePitchAlignment: "map",
                }}
              />
              <MapLibreGL.SymbolLayer
                id="devicesLabelLayer"
                minZoomLevel={14}
                style={{
                  textField: ["get", "name"],
                  textSize: 10,
                  textOffset: [0, 1.4],
                  textAnchor: "top",
                  textColor: "#1f2937",
                  textHaloColor: "#ffffff",
                  textHaloWidth: 1,
                  textAllowOverlap: false,
                  textOptional: true,
                }}
              />
            </MapLibreGL.ShapeSource>
          </MapLibreGL.MapView>
          ) : (
            <View style={styles.mapLoading}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.mapLoadingText}>Memuat peta perangkat...</Text>
            </View>
          )}

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

          <TouchableOpacity
            style={[styles.mapFab, !userLocation && styles.mapFabDisabled]}
            onPress={centerOnUser}
            disabled={!userLocation}
            accessibilityRole="button"
            accessibilityLabel="Ke lokasi saya"
          >
            <LocateFixed size={22} color={userLocation ? "#2563eb" : "#9ca3af"} />
          </TouchableOpacity>
        </View>

        {/* Device Detail Modal */}
        <DeviceDetailModal
          visible={selectedDevice !== null}
          onClose={() => setSelectedDevice(null)}
          device={selectedDevice?.data || null}
          deviceType={selectedDevice?.type || null}
        />

        <Modal
          visible={showDeviceList}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowDeviceList(false)}
        >
          <SafeAreaView style={styles.listModal} edges={["top"]}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Daftar Perangkat</Text>
              <TouchableOpacity
                onPress={() => setShowDeviceList(false)}
                style={styles.listCloseButton}
                accessibilityRole="button"
                accessibilityLabel="Tutup"
              >
                <X size={24} color="#1f2937" />
              </TouchableOpacity>
            </View>
            <View style={styles.listSearchRow}>
              <Search size={18} color="#6b7280" />
              <TextInput
                style={styles.listSearchInput}
                placeholder="Cari nama / tipe perangkat..."
                value={listQuery}
                onChangeText={setListQuery}
                placeholderTextColor="#9ca3af"
              />
              {listQuery.length > 0 && (
                <TouchableOpacity onPress={() => setListQuery("")}>
                  <X size={18} color="#6b7280" />
                </TouchableOpacity>
              )}
            </View>
            <FlatList
              data={deviceListItems}
              keyExtractor={(item: any, index) =>
                `${item.type}-${item.id || index}`
              }
              renderItem={({ item }: { item: any }) => {
                const name = String(
                  item.name || item.nama || item.idPelanggan || "Tanpa Nama",
                );
                const color =
                  MARKER_COLORS[item.type as DeviceType] || "#9ca3af";
                return (
                  <TouchableOpacity
                    style={styles.listItem}
                    onPress={() => handleDeviceListPress(item)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[styles.listItemIcon, { backgroundColor: color }]}
                    >
                      {getDeviceIcon(item.type, 16, "white")}
                    </View>
                    <View style={styles.listItemBody}>
                      <Text style={styles.listItemName} numberOfLines={1}>
                        {name}
                      </Text>
                      <Text style={styles.listItemMeta} numberOfLines={1}>
                        {String(item.type || "").toUpperCase()} ·{" "}
                        {Number(item.latitude).toFixed(5)},{" "}
                        {Number(item.longitude).toFixed(5)}
                      </Text>
                    </View>
                    <MapPin size={18} color="#9ca3af" />
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
              ListEmptyComponent={
                <View style={styles.listEmpty}>
                  <Text style={styles.listEmptyText}>
                    Tidak ada perangkat ditemukan.
                  </Text>
                </View>
              }
            />
          </SafeAreaView>
        </Modal>

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
  mapFab: {
    position: "absolute",
    right: 12,
    bottom: 100,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 4,
  },
  mapFabDisabled: {
    opacity: 0.55,
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
  listModal: {
    flex: 1,
    backgroundColor: "#fff",
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  listCloseButton: {
    padding: 4,
  },
  listSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    gap: 8,
  },
  listSearchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1f2937",
    paddingVertical: 6,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  listItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  listItemBody: {
    flex: 1,
  },
  listItemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
  },
  listItemMeta: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  listSeparator: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginLeft: 60,
  },
  listEmpty: {
    padding: 32,
    alignItems: "center",
  },
  listEmptyText: {
    color: "#9ca3af",
    fontSize: 14,
  },
  mapLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    gap: 12,
  },
  mapLoadingText: {
    color: "#6b7280",
    fontSize: 14,
  },
});
