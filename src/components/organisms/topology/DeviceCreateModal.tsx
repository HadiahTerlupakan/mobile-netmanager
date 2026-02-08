import { logger } from "@/utils/logger";
import { Picker } from "@react-native-picker/picker";
import { MapPin, X } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
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

// Matched with Admin Portal NodeFormModal.tsx
const DEVICE_TYPES = [
  { label: "ODP (Optical Distribution Point)", value: "ODP" },
  { label: "ODC (Optical Distribution Cabinet)", value: "ODC" },
  { label: "OLT / Server", value: "OLT" },
  { label: "ONT (Optical Network Terminal)", value: "ONT" },
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
  
  // New fields from Admin Portal
  const [capacity, setCapacity] = useState("8");
  const [splitter, setSplitter] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [pppoe, setPppoe] = useState("");

  // New fields for topology
  const [attenuationInput, setAttenuationInput] = useState("");
  const [attenuationOutput, setAttenuationOutput] = useState("");
  const [inputCoreColor, setInputCoreColor] = useState("");

  // Relations (Parent only, Site removed as per Admin Portal)
  const [parents, setParents] = useState<{ label: string; value: string }[]>(
    [],
  );
  const [selectedParent, setSelectedParent] = useState<string | null>(null);

  const fetchParents = useCallback(async () => {
    // Only fetch parents if we are creating an ODP (needs ODC parent) or generally if needed
    // Admin portal doesn't restrict, but mobile UX usually suggests connecting ODP to ODC.
    // We'll fetch all nodes and filter.
    
    setParents([]);
    // Don't reset selectedParent immediately to avoid UI flicker if refreshing, 
    // but here we probably want to reset if type changes.
    // Ideally we should run this only when deviceType changes.
    
    try {
        // Use the new Map Nodes endpoint
        const res = await api.get("/api/map/nodes");
        const nodes = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        
        // Determine parent type based on current device type
        let parentType = 'odc';
        if (deviceType === 'ODC') parentType = 'olt';
        if (deviceType === 'ONT') parentType = 'odp';
        if (deviceType === 'OLT') {
             // OLT usually has no parent in this context, or maybe upstream router? 
             // Admin doesn't enforce parent for OLT.
             setParents([]);
             return;
        }
        
        // Admin portal returns lowercase types 'odc', 'odp', 'olt'
        const validParents = nodes.filter((n: any) => n.type === parentType);
        
        setParents(validParents.map((i: any) => ({ label: i.name, value: i.nodeId })));
        
    } catch (e) {
      logger.error("Failed to fetch parents", e);
    }
  }, [deviceType]);

  useEffect(() => {
    if (visible) {
      if (initialLocation) {
        setLocationName(
          `${initialLocation.latitude.toFixed(6)}, ${initialLocation.longitude.toFixed(6)}`,
        );
      }
      fetchParents();
    }
  }, [visible, initialLocation, fetchParents]);

  const handleSubmit = async () => {
    if (!name || !deviceType || !initialLocation) {
      Alert.alert("Error", "Mohon lengkapi data wajib (Nama, Lokasi)");
      return;
    }

    setLoading(true);
    try {
      // 1. Create Node
      const payload = {
        type: deviceType.toLowerCase(),
        name,
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
        capacity: parseInt(capacity) || 0,
        splitter,
        pppoe,
        serialNumber,
        notes,
        attenuationInput,
        attenuationOutput,
        inputCoreColor,
      };

      const res = await api.post("/api/map/nodes", payload);
      // Check response for newNode
      const newNode = res.data?.data || res.data;
      
      if (!newNode || !newNode.nodeId) {
          // If response structure is different, try to debug or assume success?
          // But we need ID for edge creation.
          logger.warn("Create Node Response:", res.data);
          if (!newNode.nodeId) throw new Error("Gagal membuat node: ID tidak diterima");
      }

      // 2. Create Edge if parent selected
      if (selectedParent) {
          await api.post("/api/map/edges", {
              source: selectedParent,
              target: newNode.nodeId,
              fiberType: "Drop Core", // Default fiber type
          });
      }

      Alert.alert("Sukses", "Perangkat berhasil ditambahkan");
      onSuccess();
      onClose();

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
            <Text style={styles.title}>Tambah Perangkat (Admin-Sync)</Text>
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
            
            {/* Parent Selection */}
            <Text style={styles.label}>Induk / Parent (Opsional)</Text>
             <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedParent}
                    onValueChange={(itemValue) => setSelectedParent(itemValue)}
                    enabled={parents.length > 0}
                  >
                    <Picker.Item
                      label={
                        parents.length > 0
                          ? `Pilih ${deviceType === 'ODP' ? 'ODC' : deviceType === 'ONT' ? 'ODP' : 'Parent'}`
                          : "Tidak ada parent tersedia"
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

            {/* Extra Fields from Admin */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Kapasitas</Text>
                    <TextInput
                      style={styles.input}
                      value={capacity}
                      onChangeText={setCapacity}
                      keyboardType="numeric"
                      placeholder="8"
                    />
                </View>
                 <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Splitter</Text>
                    <TextInput
                      style={styles.input}
                      value={splitter}
                      onChangeText={setSplitter}
                      placeholder="1:8"
                    />
                </View>
            </View>

            {(deviceType === 'ODP' || deviceType === 'ODC') && (
                <>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Redaman Input (dBm)</Text>
                            <TextInput
                                style={styles.input}
                                value={attenuationInput}
                                onChangeText={setAttenuationInput}
                                keyboardType="numeric"
                                placeholder="-20.5"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Redaman Output (dBm)</Text>
                            <TextInput
                                style={styles.input}
                                value={attenuationOutput}
                                onChangeText={setAttenuationOutput}
                                keyboardType="numeric"
                                placeholder="-22.0"
                            />
                        </View>
                    </View>

                    <Text style={styles.label}>Warna Core Input</Text>
                    <TextInput
                        style={styles.input}
                        value={inputCoreColor}
                        onChangeText={setInputCoreColor}
                        placeholder="Contoh: Biru, Merah"
                    />
                </>
            )}
            
            <Text style={styles.label}>Serial Number</Text>
            <TextInput
              style={styles.input}
              value={serialNumber}
              onChangeText={setSerialNumber}
              placeholder="S/N Perangkat"
            />
            
            {deviceType === 'ONT' && (
                <>
                    <Text style={styles.label}>PPPoE Username</Text>
                    <TextInput
                      style={styles.input}
                      value={pppoe}
                      onChangeText={setPppoe}
                      placeholder="Username PPPoE"
                    />
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
