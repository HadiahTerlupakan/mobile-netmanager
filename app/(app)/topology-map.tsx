import { TopologySkeleton } from "@/components/molecules/TopologySkeleton";
import { useAuth } from "@/context/AuthContext";
import { useApiQuery } from "@/hooks/queries";
import api from "@/services/api";
import toGeoJSON from "@/utils/togeojson-wrapper";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { DOMParser } from "@xmldom/xmldom";
import { useRouter } from "expo-router";
import {
    ArrowLeft,
    Layers,
    MapPin,
    Plus,
    RefreshCw,
    Target,
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
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { logger } from "@/utils/logger";

import { DeviceCreateModal } from "@/components/organisms/topology/DeviceCreateModal";
import {
    DeviceData,
    DeviceDetailModal,
    DeviceType,
} from "@/components/organisms/topology/DeviceDetailModal";
import { FilterPanel } from "@/components/organisms/topology/FilterPanel";
import { TopologyErrorBoundary } from "@/components/organisms/topology/TopologyErrorBoundary";

const MARKER_COLORS: Record<DeviceType, string> = {
  otb: "#3b82f6", // blue
  odc: "#10b981", // green
  odp: "#f97316", // orange
  joinbox: "#a855f7", // purple
  pole: "#6b7280", // gray
  pelanggan: "#ec4899", // pink
  kmz: "#6366f1", // indigo
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
  }[];
  odcs: {
    id: string;
    name: string;
    location: string | null;
    latitude: number;
    longitude: number;
    notes: string | null;
    images: string[];
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
  kmzFiles?: {
    id: string;
    name: string;
    kmlPath: string;
    lineColor: string;
    isActive: boolean;
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

export default function TopologyMapScreen() {
  const router = useRouter();
  const { token } = useAuth();

  // Fetch topology data with useApiQuery
  const {
    data,
    isLoading: loading,
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
  });

  const [kmzFeatures, setKmzFeatures] = useState<GeoJSON.Feature[]>([]);
  const kmzCache = useRef<Map<string, GeoJSON.Feature[]>>(new Map()); // Cache for processed KMZ files
  const cameraRef = useRef<any>(null);
  const shapeSourceRef = useRef<any>(null);

  const [selectedDevice, setSelectedDevice] = useState<{
    data: DeviceData;
    type: DeviceType;
  } | null>(null);

  const [showFilters, setShowFilters] = useState(false);

  // Creation Mode State
  const [isPickerMode, setIsPickerMode] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  // Use ref for currentCenter to prevent re-renders
  const currentCenterRef = useRef<[number, number] | null>(null);

  // Camera position refs for stable MapLibre Camera props
  const cameraCenterRef = useRef<[number, number]>([106.816666, -6.2]);
  const cameraZoomRef = useRef(12);

  // Memoize map style to prevent reloads on render
  const mapStyle = useMemo(
    () => ({
      version: 8,
      sources: {
        osm: {
          type: "raster",
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors",
        },
      },
      layers: [
        {
          id: "osm-tiles",
          type: "raster",
          source: "osm",
          minzoom: 0,
          maxzoom: 19,
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

  // Connection lines GeoJSON
  const connectionLines = useMemo((): GeoJSON.FeatureCollection => {
    if (!data) return { type: "FeatureCollection", features: [] };

    const features: GeoJSON.Feature[] = [];

    // ODC to OTB connections
    if (visibility.odc && visibility.otb) {
      data.odcs.forEach((odc) => {
        if (odc.otbCore?.otb) {
          features.push({
            type: "Feature",
            properties: { color: "#10b981" },
            geometry: {
              type: "LineString",
              coordinates: [
                [odc.longitude, odc.latitude],
                [odc.otbCore.otb.longitude, odc.otbCore.otb.latitude],
              ],
            },
          });
        }
      });
    }

    // ODP to ODC connections
    if (visibility.odp && visibility.odc) {
      data.odps.forEach((odp) => {
        if (odp.odcOutput?.odc) {
          features.push({
            type: "Feature",
            properties: { color: "#f97316" },
            geometry: {
              type: "LineString",
              coordinates: [
                [odp.longitude, odp.latitude],
                [odp.odcOutput.odc.longitude, odp.odcOutput.odc.latitude],
              ],
            },
          });
        }
      });
    }

    // Pelanggan to ODP connections
    if (visibility.pelanggan && visibility.odp) {
      data.pelanggans.forEach((pelanggan) => {
        if (pelanggan.odp) {
          features.push({
            type: "Feature",
            properties: { color: "#ec4899" },
            geometry: {
              type: "LineString",
              coordinates: [
                [pelanggan.longitude, pelanggan.latitude],
                [pelanggan.odp.longitude, pelanggan.odp.latitude],
              ],
            },
          });
        }
      });
    }

    return { type: "FeatureCollection", features };
  }, [data, visibility]);

  // KMZ GeoJSON
  const kmzGeoJson = useMemo(() => {
    if (!visibility.kmz || !kmzFeatures || kmzFeatures.length === 0) {
      return { type: "FeatureCollection", features: [] };
    }
    return { type: "FeatureCollection", features: kmzFeatures };
  }, [visibility.kmz, kmzFeatures]);

  // Convert data to GeoJSON for ShapeSource
  const devicesGeoJson = useMemo((): GeoJSON.FeatureCollection => {
    if (!data) return { type: "FeatureCollection", features: [] };

    const features: GeoJSON.Feature[] = [];
    const addFeature = (d: { id: string; longitude: number; latitude: number; name?: string; nama?: string; idPelanggan?: string }, type: DeviceType, color: string) => {
      features.push({
        type: "Feature",
        id: type + "-" + d.id,
        properties: {
          id: d.id,
          type: type,
          color: color,
          name: d.name || d.nama || d.idPelanggan,
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

    return { type: "FeatureCollection", features };
  }, [data, visibility]);

  const onShapePress = useCallback(
    async (event: MapLibreGL.OnPressEvent) => {
      const { features } = event;
      const feature = features[0] as GeoJSON.Feature;

      if (!feature) return;

      const isCluster = feature.properties?.cluster;

      if (isCluster) {
        // Handle cluster press (Zoom in to expansion level)
        logger.info("Cluster pressed, calculating expansion zoom...");
        try {
          const expansionZoom =
            await shapeSourceRef.current?.getClusterExpansionZoom(feature);

          if (expansionZoom) {
            logger.info("Zooming to:", expansionZoom);
            cameraRef.current?.setCamera({
              centerCoordinate: (feature.geometry as any).coordinates,
              zoomLevel: expansionZoom,
              animationDuration: 500,
            });
          } else {
            // Fallback if expansion zoom is not returned
            cameraRef.current?.setCamera({
              centerCoordinate: (feature.geometry as any).coordinates,
              zoomLevel: zoomRef.current + 2,
              animationDuration: 500,
            });
          }
        } catch (error) {
          logger.error("Error getting cluster expansion zoom:", error);
          // Fallback on error
          cameraRef.current?.setCamera({
            centerCoordinate: (feature.geometry as any).coordinates,
            zoomLevel: zoomRef.current + 2,
            animationDuration: 500,
          });
        }
      } else {
        // Handle single device press
        const { id, type } = feature.properties as { id: string; type: DeviceType };
        logger.info("Device pressed:", type, id);

        // Find original data object
        let deviceData: DeviceData | null = null;
        if (data) {
          switch (type) {
            case "otb":
              const otb = data.otbs.find((d) => d.id === id);
              if (otb) deviceData = otb as unknown as DeviceData;
              break;
            case "odc":
              const odc = data.odcs.find((d) => d.id === id);
              if (odc) deviceData = odc as unknown as DeviceData;
              break;
            case "odp":
              const odp = data.odps.find((d) => d.id === id);
              if (odp) deviceData = odp as unknown as DeviceData;
              break;
            case "joinbox":
              const joinbox = data.joinboxes.find((d) => d.id === id);
              if (joinbox) deviceData = joinbox as unknown as DeviceData;
              break;
            case "pole":
              const pole = data.poles.find((d) => d.id === id);
              if (pole) deviceData = pole as unknown as DeviceData;
              break;
            case "pelanggan":
              const pelanggan = data.pelanggans.find((d) => d.id === id);
              if (pelanggan) deviceData = pelanggan as unknown as DeviceData;
              break;
          }
        }

        if (deviceData) {
          logger.info("Device selected:", type, deviceData.id);
          handleMarkerPress(deviceData, type);
        }
      }
    },
    [data, handleMarkerPress],
  );

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
    };
  }, [data]);

  const handleToggleVisibility = useCallback((type: DeviceType) => {
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
      currentCenterRef.current = center;
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

        {/* KMZ Loading Indicator */}
        {loadingKmz && (
          <View style={styles.kmzLoading}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text style={styles.kmzLoadingText}>Memuat KMZ...</Text>
          </View>
        )}

        {/* Filter Panel */}
        {showFilters && (
          <FilterPanel
            visibility={visibility}
            onToggle={handleToggleVisibility}
            counts={counts}
          />
        )}

        {/* Map Content - Using mapStyle prop (v10+) */}
        <MapLibreGL.MapView
          key="topology-map-view"
          style={styles.map}
          mapStyle={mapStyle}
          logoEnabled={false}
          onRegionDidChange={handleCameraChange}
          onDidFinishLoadingStyle={handleStyleLoaded}
        >
          <MapLibreGL.Camera
            ref={cameraRef}
            followUserLocation={false}
            defaultSettings={{
              centerCoordinate: [106.816666, -6.2], // Jakarta, Indonesia
              zoomLevel: 10, // Reasonable zoom to see the area
            }}
          />

          {/* Connection Lines (GeoJSON) */}
          <MapLibreGL.ShapeSource
            id="linesSource"
            shape={connectionLines}
          >
            <MapLibreGL.LineLayer
              id="linesLayer"
              style={{
                lineColor: ["get", "color"],
                lineWidth: 2,
                lineDasharray: [2, 2],
              }}
            />
          </MapLibreGL.ShapeSource>

          {/* KMZ/KML Layers */}
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

          {/* DEVICE MARKERS (Native Rendering) */}
          <MapLibreGL.ShapeSource
            ref={shapeSourceRef}
            id="devicesSource"
            shape={devicesGeoJson}
            cluster={true}
            clusterRadius={50}
            clusterMaxZoomLevel={14}
            onPress={onShapePress}
            hitbox={{ width: 20, height: 20 }}
          >
            {/* 1. Unclustered Points (Individual Markers) */}
            {/* Invisible Hitbox Layer (Large) */}
            <MapLibreGL.CircleLayer
              id="unclustered-point-hitbox"
              filter={["!", ["has", "point_count"]]}
              style={{
                circleColor: "transparent",
                circleRadius: 22, // 44px diameter touch target
                circleOpacity: 0,
                circleStrokeWidth: 0,
              }}
            />
            {/* Visual Dot Layer */}
            <MapLibreGL.CircleLayer
              id="unclustered-point"
              filter={["!", ["has", "point_count"]]}
              style={{
                circleColor: ["get", "color"],
                circleRadius: 6, // 12px visual size
                circleStrokeWidth: 2,
                circleStrokeColor: "white",
              }}
            />

            {/* 2. Clustered Points (Groups) */}
            <MapLibreGL.CircleLayer
              id="clustered-point"
              filter={["has", "point_count"]}
              style={{
                circleColor: [
                  "step",
                  ["get", "point_count"],
                  "#3b82f6", // default blue
                  10,
                  "#eab308", // yellow
                  20,
                  "#f97316", // orange
                  50,
                  "#dc2626", // red
                ],
                circleRadius: [
                  "step",
                  ["get", "point_count"],
                  10, // default 20px
                  10,
                  12, // 24px
                  20,
                  15, // 30px
                  50,
                  18, // 36px
                ],
                circleStrokeWidth: 2,
                circleStrokeColor: "white",
              }}
            />

            {/* 3. Cluster Counts (Text) */}
            <MapLibreGL.SymbolLayer
              id="cluster-count"
              filter={["has", "point_count"]}
              style={{
                textField: "{point_count_abbreviated}",
                textSize: 12,
                textColor: "#ffffff",
                textAllowOverlap: true,
                textIgnorePlacement: true,
                textAnchor: "center",
              }}
            />
          </MapLibreGL.ShapeSource>
        </MapLibreGL.MapView>

        {/* Refresh Button */}
        <TouchableOpacity style={styles.refreshButton} onPress={() => fetchData()}>
          <RefreshCw size={20} color="#fff" />
        </TouchableOpacity>

        {/* Creation Modal */}
        <DeviceCreateModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          initialLocation={
            currentCenterRef.current
              ? {
                  latitude: currentCenterRef.current[1],
                  longitude: currentCenterRef.current[0],
                }
              : undefined
          }
          onSuccess={() => {
            fetchData();
            setIsPickerMode(false);
          }}
        />

        {/* Mobile Creation UI Elements */}

        {/* Crosshair (Picker Mode Only) */}
        {isPickerMode && (
          <View style={styles.crosshairContainer} pointerEvents="none">
            <Target size={40} color="#EF4444" />
          </View>
        )}

        {/* FAB & Action Buttons */}
        <View style={styles.fabContainer}>
          {!isPickerMode ? (
            <TouchableOpacity
              style={styles.fab}
              onPress={() => {
                setIsPickerMode(true);
                Alert.alert(
                  "Mode Tambah Device",
                  "Geser peta untuk menentukan lokasi, lalu tekan 'Pasang Disini'",
                );
              }}
            >
              <Plus color="white" size={24} />
            </TouchableOpacity>
          ) : (
            <View style={styles.pickerControls}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: "#EF4444", marginRight: 8 },
                ]}
                onPress={() => setIsPickerMode(false)}
              >
                <Text style={styles.actionButtonText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#10B981" }]}
                onPress={() => setShowCreateModal(true)}
              >
                <MapPin color="white" size={16} style={{ marginRight: 4 }} />
                <Text style={styles.actionButtonText}>Pasang Disini</Text>
              </TouchableOpacity>
            </View>
          )}
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
  refreshButton: {
    position: "absolute",
    top: 110, // Move to top below header
    right: 16,
    backgroundColor: "#3b82f6",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 5,
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
    top: 110,
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
    top: 60,
    left: 16,
    right: 16,
    zIndex: 20,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
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
  },
  crosshairContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 15,
  },
  fabContainer: {
    position: "absolute",
    bottom: 30,
    right: 20,
    left: 20,
    alignItems: "flex-end",
    zIndex: 30,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  pickerControls: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "center",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  actionButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  kmzLoadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#6b7280",
  },
});
