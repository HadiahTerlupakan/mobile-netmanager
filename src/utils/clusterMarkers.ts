/**
 * Marker Clustering Utility for Topology Map
 * Groups nearby markers based on zoom level to improve rendering performance
 */

import { Cluster, MarkerData } from '../types/topology';

/**
 * Cluster markers based on zoom level
 * @param markers - Array of markers to cluster
 * @param zoom - Current map zoom level
 * @param clusterRadius - Base clustering radius (default: 50)
 * @returns Array of clusters and individual markers
 */
export function clusterMarkers(
  markers: MarkerData[],
  zoom: number,
  clusterRadius: number = 50
): Array<MarkerData | Cluster> {
  // Don't cluster at high zoom levels (show all markers)
  if (zoom >= 14) {
    return markers;
  }

  // Calculate radius based on zoom level (smaller radius at higher zoom)
  const radius = clusterRadius / Math.pow(2, zoom - 8);

  const clusters: Map<string, Cluster> = new Map();

  markers.forEach(marker => {
    let clustered = false;

    // Try to add to existing cluster
    for (const [key, cluster] of clusters) {
      const distance = Math.sqrt(
        Math.pow(marker.latitude - cluster.latitude, 2) +
        Math.pow(marker.longitude - cluster.longitude, 2)
      );

      if (distance <= radius) {
        cluster.count++;
        cluster.markers.push(marker);

        // Update cluster center (weighted average)
        cluster.latitude = (cluster.latitude * (cluster.count - 1) + marker.latitude) / cluster.count;
        cluster.longitude = (cluster.longitude * (cluster.count - 1) + marker.longitude) / cluster.count;

        clustered = true;
        break;
      }
    }

    // Create new cluster if not added to existing one
    if (!clustered) {
      const gridKey = `${Math.floor(marker.latitude / radius)}_${Math.floor(marker.longitude / radius)}`;
      const clusterId = `cluster-${gridKey}-${Math.random().toString(36).substr(2, 9)}`;

      clusters.set(clusterId, {
        id: clusterId,
        latitude: marker.latitude,
        longitude: marker.longitude,
        count: 1,
        markers: [marker]
      });
    }
  });

  // Return only clusters (not individual markers) when clustering is active
  return Array.from(clusters.values());
}

/**
 * Check if a marker is a cluster
 */
export function isCluster(marker: MarkerData | Cluster): marker is Cluster {
  return 'count' in marker && 'markers' in marker;
}

/**
 * Get cluster color based on number of markers
 */
export function getClusterColor(cluster: Cluster): string {
  if (cluster.count >= 50) return '#dc2626'; // Red for very large clusters
  if (cluster.count >= 20) return '#f97316'; // Orange for large clusters
  if (cluster.count >= 10) return '#eab308'; // Yellow for medium clusters
  return '#3b82f6'; // Blue for small clusters
}

/**
 * Get cluster size based on number of markers
 */
export function getClusterSize(cluster: Cluster): number {
  const baseSize = 24;
  const maxSize = 64;
  const size = baseSize + Math.min(cluster.count, 50) * 0.7;
  return Math.min(size, maxSize);
}
