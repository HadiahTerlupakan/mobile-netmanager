import { Picker } from "@react-native-picker/picker";
import { MapPin, X } from "lucide-react-native";
import { logger } from "@/utils/logger";
import React, { useEffect, useState, useCallback } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import api from "../../../services/api";

interface DeviceCreateModalProps {
  visible: boolean;
  onClose: () => void;
  initialLocation?: { latitude: number; longitude: number };
  onSuccess: () => void;
}

const DEVICE_TYPES = [
  { label: "ODP", value: "ODP" },
  { label: "ODC", value: "ODC" },
  { label: "Tiang (Pole)", value: "POLE" },
  { label: "Join Box", value: "JOINBOX" },
];

export function DeviceCreateModal({
  visible,
  onClose,
  initialLocation,
  onSuccess,
}: DeviceCreateModalProps) {
  const [loading, setLoading] = useState(false);
  const [deviceType, setDeviceType] = useState("ODP");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [locationName, setLocationName] = useState("");

  // Relations
  const [sites, setSites] = useState<{ label: string; value: string }[]>([]);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);

  const [parents, setParents] = useState<{ label: string; value: string }[]>(
    [],
  );
  const [selectedParent, setSelectedParent] = useState<string | null>(null);

  const fetchParents = useCallback(async () => {
    setParents([]);
    setSelectedParent(null);
    try {
      let endpoint = "";
      if (deviceType === "ODP") endpoint = "/api/odcs";

      if (!endpoint) return;

      const res = await api.get(endpoint);
      let items: { name: string; id: string; siteId: string }[] = [];
      if (deviceType === "ODP" && res.data?.odcs) items = res.data.odcs;

      if (selectedSite) {
        items = items.filter((i) => i.siteId === selectedSite);
      }

      setParents(items.map((i) => ({ label: i.name, value: i.id })));
    } catch (e) {
      logger.error("Failed to fetch parents", e);
    }
  }, [deviceType, selectedSite]);

  useEffect(() => {
    if (visible) {
      fetchSites();
      if (initialLocation) {
        setLocationName(
          `${initialLocation.latitude.toFixed(6)}, ${initialLocation.longitude.toFixed(6)}`,
        );
      }
    }
  }, [visible, initialLocation]);

  useEffect(() => {
    if (visible && selectedSite) {
      fetchParents();
    }
  }, [visible, selectedSite, deviceType, fetchParents]);

  const fetchSites = async () => {
    try {
      const res = await api.get("/api/sites");
      if (res.data?.sites) {
        setSites(
          res.data.sites.map((s: { name: string; id: string }) => ({ label: s.name, value: s.id })),
        );
        if (res.data.sites.length > 0) {
          setSelectedSite(res.data.sites[0].id);
        }
      }
    } catch (e) {
      logger.error("Failed to fetch sites", e);
    }
  };

  const handleSubmit = async () => {
    if (!name || !deviceType || !initialLocation) {
      Alert.alert("Error", "Mohon lengkapi data wajib (Nama, Lokasi)");
      return;
    }

    setLoading(true);
    try {
      let endpoint = "";
      const payload: Record<string, unknown> = {
        name,
        notes,
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
        status: "AKTIF",
        siteId: selectedSite,
        images: [],
      };

      if (deviceType === "ODP") {
        endpoint = "/api/odps";
        payload.odcId = selectedParent;
      } else if (deviceType === "ODC") {
        endpoint = "/api/odcs";
      } else if (deviceType === "POLE") {
        endpoint = "/api/poles";
      } else if (deviceType === "JOINBOX") {
        endpoint = "/api/joinboxes";
      }

      if (endpoint) {
        await api.post(endpoint, payload);
        Alert.alert("Sukses", "Perangkat berhasil ditambahkan");
        onSuccess();
        onClose();
      } else {
        Alert.alert("Error", "Tipe perangkat belum didukung sepenuhnya");
      }
    } catch (err) {
      logger.error(err);
      const errorMessage = err instanceof Error ? err.message : "Gagal menyimpan data";
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Tambah Perangkat Baru</Text>
            <TouchableOpacity onPress={onClose}>
              <X color="#000" size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.label}>Tipe Perangkat</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={deviceType}
                onValueChange={(itemValue) => setDeviceType(itemValue)}
              >
                {DEVICE_TYPES.map((type) => (
                  <Picker.Item
                    key={type.value}
                    label={type.label}
                    value={type.value}
                  />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Nama Perangkat</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Contoh: ODP-JKT-001"
            />

            <Text style={styles.label}>Site / Area</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedSite}
                onValueChange={(itemValue) => setSelectedSite(itemValue)}
              >
                <Picker.Item label="Pilih Site" value={null} />
                {sites.map((site) => (
                  <Picker.Item
                    key={site.value}
                    label={site.label}
                    value={site.value}
                  />
                ))}
              </Picker>
            </View>

            {deviceType === "ODP" && (
              <>
                <Text style={styles.label}>Koneksi ke ODC (Opsional)</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedParent}
                    onValueChange={(itemValue) => setSelectedParent(itemValue)}
                    enabled={parents.length > 0}
                  >
                    <Picker.Item
                      label={
                        parents.length > 0
                          ? "Pilih ODC Induk"
                          : "Tidak ada ODC tersedia"
                      }
                      value={null}
                    />
                    {parents.map((parent) => (
                      <Picker.Item
                        key={parent.value}
                        label={parent.label}
                        value={parent.value}
                      />
                    ))}
                  </Picker>
                </View>
              </>
            )}

            <Text style={styles.label}>Koordinat</Text>
            <View style={styles.readonlyInput}>
              <MapPin size={16} color="#666" style={{ marginRight: 8 }} />
              <Text style={{ color: "#333" }}>{locationName}</Text>
            </View>

            <Text style={styles.label}>Catatan</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Keterangan tambahan..."
              multiline
            />

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitText}>Simpan Perangkat</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "90%",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    marginBottom: 4,
  },
  readonlyInput: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  submitButton: {
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
  },
  disabledButton: {
    backgroundColor: "#93C5FD",
  },
  submitText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
