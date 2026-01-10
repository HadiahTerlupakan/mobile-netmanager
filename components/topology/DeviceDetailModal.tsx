import { Building2, Info, MapPin, Navigation, User, X } from 'lucide-react-native';
import React from 'react';
import {
    Linking,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type DeviceType = 'otb' | 'odc' | 'odp' | 'joinbox' | 'pole' | 'pelanggan' | 'kmz';

export interface DeviceData {
  id: string;
  name?: string;
  nama?: string;
  idPelanggan?: string;
  location?: string | null;
  alamat?: string | null;
  latitude: number;
  longitude: number;
  notes?: string | null;
  status?: string;
  cableSlack?: boolean;
}

interface DeviceDetailModalProps {
  visible: boolean;
  onClose: () => void;
  device: DeviceData | null;
  deviceType: DeviceType | null;
}

const DEVICE_COLORS: Record<DeviceType, string> = {
  otb: '#3b82f6',      // blue
  odc: '#10b981',      // green
  odp: '#f97316',      // orange
  joinbox: '#a855f7',  // purple
  pole: '#6b7280',     // gray
  pelanggan: '#ec4899', // pink
  kmz: '#6366f1',      // indigo
};

const DEVICE_LABELS: Record<DeviceType, string> = {
  otb: 'OTB',
  odc: 'ODC',
  odp: 'ODP',
  joinbox: 'Joinbox',
  pole: 'Tiang',
  pelanggan: 'Pelanggan',
  kmz: 'Jalur Fiber',
};

export function DeviceDetailModal({
  visible,
  onClose,
  device,
  deviceType,
}: DeviceDetailModalProps) {
  const insets = useSafeAreaInsets();
  
  if (!device || !deviceType) return null;

  const displayName = device.name || device.nama || device.idPelanggan || 'Tidak ada nama';
  const color = DEVICE_COLORS[deviceType];
  const label = DEVICE_LABELS[deviceType];

  const openInMaps = () => {
    const scheme = Platform.select({
      ios: 'maps:',
      android: 'geo:',
    });
    const url = Platform.select({
      ios: `${scheme}${device.latitude},${device.longitude}?q=${displayName}`,
      android: `${scheme}${device.latitude},${device.longitude}?q=${device.latitude},${device.longitude}(${displayName})`,
    });
    
    if (url) {
      Linking.openURL(url);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: color }]}>
            <View style={styles.headerContent}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{label}</Text>
              </View>
              <Text style={styles.title} numberOfLines={2}>
                {displayName}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content}>
            {/* ID Pelanggan */}
            {device.idPelanggan && (
              <View style={styles.row}>
                <User size={18} color="#6b7280" />
                <View style={styles.rowContent}>
                  <Text style={styles.label}>ID Pelanggan</Text>
                  <Text style={styles.value}>{device.idPelanggan}</Text>
                </View>
              </View>
            )}

            {/* Lokasi */}
            {(device.location || device.alamat) && (
              <View style={styles.row}>
                <Building2 size={18} color="#6b7280" />
                <View style={styles.rowContent}>
                  <Text style={styles.label}>Lokasi</Text>
                  <Text style={styles.value}>{device.location || device.alamat}</Text>
                </View>
              </View>
            )}

            {/* Koordinat */}
            <View style={styles.row}>
              <MapPin size={18} color="#6b7280" />
              <View style={styles.rowContent}>
                <Text style={styles.label}>Koordinat</Text>
                <Text style={styles.value}>
                  {device.latitude.toFixed(6)}, {device.longitude.toFixed(6)}
                </Text>
              </View>
            </View>

            {/* Status (untuk pelanggan) */}
            {device.status && (
              <View style={styles.row}>
                <Info size={18} color="#6b7280" />
                <View style={styles.rowContent}>
                  <Text style={styles.label}>Status</Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: device.status === 'AKTIF' ? '#dcfce7' : '#fef3c7' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: device.status === 'AKTIF' ? '#166534' : '#92400e' }
                    ]}>
                      {device.status}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Cable Slack (untuk pole) */}
            {typeof device.cableSlack === 'boolean' && (
              <View style={styles.row}>
                <Info size={18} color="#6b7280" />
                <View style={styles.rowContent}>
                  <Text style={styles.label}>Cable Slack</Text>
                  <Text style={styles.value}>{device.cableSlack ? 'Ya' : 'Tidak'}</Text>
                </View>
              </View>
            )}

            {/* Notes */}
            {device.notes && (
              <View style={styles.row}>
                <Info size={18} color="#6b7280" />
                <View style={styles.rowContent}>
                  <Text style={styles.label}>Catatan</Text>
                  <Text style={styles.value}>{device.notes}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
            <TouchableOpacity
              style={[styles.navigateButton, { backgroundColor: color }]}
              onPress={openInMaps}
            >
              <Navigation size={20} color="#fff" />
              <Text style={styles.navigateButtonText}>Buka di Maps</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerContent: {
    flex: 1,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  rowContent: {
    flex: 1,
    marginLeft: 12,
  },
  label: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
  },
  navigateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
