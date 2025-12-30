import { Eye, EyeOff } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { DeviceType } from './DeviceDetailModal';

interface VisibilityState {
  otb: boolean;
  odc: boolean;
  odp: boolean;
  joinbox: boolean;
  pole: boolean;
  pelanggan: boolean;
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
  };
}

const FILTER_ITEMS: Array<{ type: DeviceType; label: string; color: string }> = [
  { type: 'otb', label: 'OTB', color: '#3b82f6' },
  { type: 'odc', label: 'ODC', color: '#10b981' },
  { type: 'odp', label: 'ODP', color: '#f97316' },
  { type: 'joinbox', label: 'Joinbox', color: '#a855f7' },
  { type: 'pole', label: 'Tiang', color: '#6b7280' },
  { type: 'pelanggan', label: 'Pelanggan', color: '#ec4899' },
];

export function FilterPanel({ visibility, onToggle, counts }: FilterPanelProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {FILTER_ITEMS.map((item) => {
          const isVisible = visibility[item.type];
          const count = counts[item.type];

          return (
            <TouchableOpacity
              key={item.type}
              style={[
                styles.filterButton,
                {
                  backgroundColor: isVisible ? item.color : '#f3f4f6',
                  borderColor: item.color,
                },
              ]}
              onPress={() => onToggle(item.type)}
              activeOpacity={0.7}
            >
              {isVisible ? (
                <Eye size={14} color="#fff" />
              ) : (
                <EyeOff size={14} color={item.color} />
              )}
              <Text
                style={[
                  styles.filterLabel,
                  { color: isVisible ? '#fff' : item.color },
                ]}
              >
                {item.label}
              </Text>
              <View
                style={[
                  styles.countBadge,
                  {
                    backgroundColor: isVisible
                      ? 'rgba(255,255,255,0.3)'
                      : 'rgba(0,0,0,0.1)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    { color: isVisible ? '#fff' : item.color },
                  ]}
                >
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
