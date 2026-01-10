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

export const DeviceDetailModal = React.memo<DeviceDetailModalProps>(({
  visible,
  onClose,
  device,
  deviceType,
}: DeviceDetailModalProps) => {
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

            {/* OTB Information (for ODC) */}
            {deviceType === 'odc' && (device as any).otbCore?.otb && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Terhubung ke OTB</Text>
                <View style={styles.card}>
                  <View style={styles.row}>
                    <Text style={styles.label}>OTB:</Text>
                    <Text style={styles.value}>{(device as any).otbCore.otb.name}</Text>
                  </View>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Tube</Text>
                      <View style={[styles.colorBadge, { backgroundColor: (device as any).otbCore.tubeColor }]}>
                         <Text style={styles.colorText}>{(device as any).otbCore.tubeColor}</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Core</Text>
                      <View style={[styles.colorBadge, { backgroundColor: (device as any).otbCore.coreColor }]}>
                         <Text style={styles.colorText}>{(device as any).otbCore.coreColor}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* ODC Information (for ODP) */}
            {deviceType === 'odp' && (device as any).odcOutput?.odc && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Terhubung ke ODC</Text>
                <View style={styles.card}>
                  <View style={styles.row}>
                    <Text style={styles.label}>ODC:</Text>
                    <Text style={styles.value}>{(device as any).odcOutput.odc.name}</Text>
                  </View>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Tube</Text>
                      <View style={[styles.colorBadge, { backgroundColor: (device as any).odcOutput.tubeColor }]}>
                         <Text style={styles.colorText}>{(device as any).odcOutput.tubeColor}</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Core</Text>
                      <View style={[styles.colorBadge, { backgroundColor: (device as any).odcOutput.coreColor }]}>
                         <Text style={styles.colorText}>{(device as any).odcOutput.coreColor}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* ODP Information (for Pelanggan) */}
            {deviceType === 'pelanggan' && (device as any).odp && (
               <View style={styles.section}>
                 <Text style={styles.sectionTitle}>Terhubung ke ODP</Text>
                 <View style={styles.card}>
                   <View style={styles.row}>
                     <Text style={styles.label}>ODP:</Text>
                     <Text style={styles.value}>{(device as any).odp.name}</Text>
                   </View>
                 </View>
               </View>
            )}

            {/* Notes */}
            {device.notes && (
              <View style={styles.section}>
                <View style={styles.row}>
                    <Info size={18} color="#6b7280" />
                    <View style={styles.rowContent}>
                        <Text style={styles.label}>Catatan</Text>
                        <Text style={styles.value}>{device.notes}</Text>
                    </View>
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
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.visible === nextProps.visible &&
    prevProps.device?.id === nextProps.device?.id &&
    prevProps.deviceType === nextProps.deviceType
  );
});

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
  section: {
    marginBottom: 20,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
    paddingLeft: 8,
  },
  card: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  colorBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
    minWidth: 60,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  colorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});
