import { Eye, EyeOff } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { DeviceType } from './DeviceDetailModal';

interface VisibilityState {
  otb: boolean;
  odc: boolean;
  odp: boolean;
  joinbox: boolean;
  pole: boolean;
  pelanggan: boolean;
  kmz: boolean;
}

interface FilterPanelProps {
  visibility: VisibilityState;
  onToggle: (type: DeviceType) => void;
  counts: {
    otb: number;
    odc: number;
    odp: number;
    joinbox: number;
    pole: number;
    pelanggan: number;
    kmz: number;
  };
}

const FILTER_ITEMS: { type: DeviceType; label: string; color: string }[] = [
  { type: 'otb', label: 'OTB', color: '#3b82f6' },
  { type: 'odc', label: 'ODC', color: '#10b981' },
  { type: 'odp', label: 'ODP', color: '#f97316' },
  { type: 'joinbox', label: 'Joinbox', color: '#a855f7' },
  { type: 'pole', label: 'Tiang', color: '#6b7280' },
  { type: 'pelanggan', label: 'Pelanggan', color: '#ec4899' },
  { type: 'kmz', label: 'Jalur Fiber', color: '#6366f1' },
];

export const FilterPanel = React.memo<FilterPanelProps>(({ visibility, onToggle, counts }: FilterPanelProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Filter & Layer</Text>
      <View style={styles.scrollContent}>
        {FILTER_ITEMS.map((item) => {
          const isVisible = visibility[item.type];
          const count = counts[item.type];

          return (
            <TouchableOpacity
              key={item.type}
              style={[
                styles.filterButton,
                {
                  backgroundColor: isVisible ? item.color + '15' : '#f3f4f6', // Light opacity background
                  borderColor: isVisible ? item.color : '#e5e7eb',
                },
              ]}
              onPress={() => onToggle(item.type)}
              activeOpacity={0.7}
            >
              {isVisible ? (
                <Eye size={14} color={item.color} />
              ) : (
                <EyeOff size={14} color="#9ca3af" />
              )}
              <Text
                style={[
                  styles.filterLabel,
                  { color: isVisible ? item.color : '#6b7280' },
                ]}
              >
                {item.label}
              </Text>
               <View
                style={[
                  styles.countBadge,
                  {
                    backgroundColor: isVisible ? item.color : '#d1d5db',
                  },
                ]}
              >
                <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.counts === nextProps.counts &&
    JSON.stringify(prevProps.visibility) === JSON.stringify(nextProps.visibility)
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30, // Move to bottom
    left: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
      fontSize: 16,
      fontWeight: '700',
      color: '#1f2937',
      marginBottom: 12,
  },
  scrollContent: {
    gap: 8,
    flexDirection: 'row',
    flexWrap: 'wrap', // Allow wrapping for a better "legend" look
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    marginBottom: 4,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
  },
});

FilterPanel.displayName = 'FilterPanel';
