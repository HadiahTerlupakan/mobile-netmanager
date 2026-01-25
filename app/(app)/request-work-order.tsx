import LoadingModal from "@/components/LoadingModal";
import { useAuth } from "@/context/AuthContext";
import { useOfflineMutationCompat as useOfflineMutation } from "@/hooks/queries";
import api from "@/services/api";
import { useRouter } from "expo-router";
import debounce from "lodash/debounce";
import {
  AlertTriangle,
  ArrowLeft,
  Search,
  Truck,
  User,
  Wifi,
  Wrench,
  X,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";

// Work Order Types - simplified
const WO_TYPES = [
  {
    value: "TROUBLESHOOT",
    label: "Troubleshoot",
    icon: Wrench,
    color: "#dc2626",
  },
];

// Quick Actions - hanya 2 template
const QUICK_ACTIONS = [
  {
    title: "FOC / UT",
    type: "TROUBLESHOOT",
    priority: "URGENT",
    description:
      "Fiber Optic Cut / Unscheduled Troubleshoot - Pelanggan tidak bisa konek sama sekali",
  },
  {
    title: "Internet Lambat",
    type: "TROUBLESHOOT",
    priority: "HIGH",
    description: "Kecepatan internet di bawah normal atau sering putus-putus",
  },
  {
    title: "Relokasi",
    type: "RELOCATION",
    priority: "NORMAL",
    description: "Pemindahan titik perangkat ke lokasi/alamat baru",
  },
];

interface MixRadiusCustomer {
  id: string;
  memberId: string;
  username: string;
  fullname: string;
  phone: string;
  address: string;
  planName: string;
  ownerName: string;
  status: string;
}

export default function RequestWorkOrderScreen() {
  const { user, token } = useAuth();
  const router = useRouter();

  // Form State
  const [type, setType] = useState("TROUBLESHOOT");
  const [priority, setPriority] = useState("HIGH");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  // Customer Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState<MixRadiusCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] =
    useState<MixRadiusCustomer | null>(null);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // UI State
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  // Offline Mutation
  const { mutate } = useOfflineMutation();

  // Search Customers from MixRadius
  const searchCustomers = useCallback(
    debounce(async (query: string) => {
      if (!query || query.length < 2) {
        setCustomers([]);
        setShowSearchResults(false);
        return;
      }
      setSearching(true);
      try {
        const res = await api.get(
          `/api/mobile/mixradius/customers?search=${encodeURIComponent(query)}`,
        );
        const data = res.data?.data || [];
        setCustomers(data);
        setShowSearchResults(true);
      } catch (error) {
        console.error("Search failed:", error);
        setCustomers([]);
      } finally {
        setSearching(false);
      }
    }, 500),
    [],
  );

  // Handle search input change
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (text.length >= 2) {
      searchCustomers(text);
    } else {
      setCustomers([]);
      setShowSearchResults(false);
    }
  };

  // Select customer and auto-fill form
  const selectCustomer = (customer: MixRadiusCustomer) => {
    setSelectedCustomer(customer);
    setShowSearchResults(false);
    setSearchQuery(customer.fullname);

    // Auto-fill title based on template
    if (!title) {
      setTitle(`Troubleshoot - ${customer.fullname}`);
    }
  };

  // Clear selected customer
  const clearCustomer = () => {
    setSelectedCustomer(null);
    setSearchQuery("");
    setCustomers([]);
  };

  // Apply Quick Action Template
  const applyQuickAction = (action: (typeof QUICK_ACTIONS)[0]) => {
    setType(action.type);
    setPriority(action.priority);
    setDescription(action.description);

    // Auto-update title if customer selected
    if (selectedCustomer) {
      setTitle(`${action.title} - ${selectedCustomer.fullname}`);
    } else {
      setTitle(action.title);
    }
  };

  // Submit Handler
  const handleSubmit = async () => {
    // Validations
    if (!selectedCustomer) {
      Alert.alert("Error", "Pilih pelanggan terlebih dahulu");
      return;
    }
    if (!title.trim()) {
      Alert.alert("Error", "Judul wajib diisi");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Error", "Deskripsi wajib diisi");
      return;
    }

    setShowLoading(true);
    setLoadingMessage("Mengirim request...");

    try {
      await mutate(
        {
          type,
          priority,
          title: title.trim(),
          description: description.trim(),
          // Customer data from MixRadius
          contactName: selectedCustomer.fullname,
          contactPhone: selectedCustomer.phone,
          locationAddress: selectedCustomer.address,
          notes:
            notes.trim() ||
            `Pelanggan: ${selectedCustomer.username} (${selectedCustomer.memberId})\nPaket: ${selectedCustomer.planName}\nOwner: ${selectedCustomer.ownerName}`,
          // Extra metadata
          mixRadiusCustomerId: selectedCustomer.id,
          mixRadiusMemberId: selectedCustomer.memberId,
        },
        {
          url: "/api/mobile/work-orders/request",
          method: "POST",
          onSuccess: (data, isOffline) => {
            setShowLoading(false);
            // Reset form before navigating back
            setType("TROUBLESHOOT");
            setPriority("HIGH");
            setTitle("");
            setDescription("");
            setNotes("");
            setSelectedCustomer(null);
            setSearchQuery("");
            setCustomers([]);

            Alert.alert(
              isOffline ? "Offline" : "Berhasil! ✅",
              isOffline
                ? "Request diantrikan dan akan dikirim saat online"
                : "Request Work Order berhasil dikirim.\nMenunggu persetujuan Admin.",
              [{ text: "OK", onPress: () => router.back() }],
            );
          },
          onError: (err) => {
            setShowLoading(false);
            Alert.alert("Error", err.message || "Gagal mengirim request");
          },
        },
      );
    } catch (error) {
      setShowLoading(false);
      Alert.alert("Error", "Terjadi kesalahan");
    }
  };

  const selectedType = WO_TYPES.find((t) => t.value === type);
  const isFormValid = selectedCustomer && title.trim() && description.trim();

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {/* Header */}
      <View
        style={tw`px-6 py-4 flex-row items-center bg-white border-b border-gray-100`}
      >
        <TouchableOpacity onPress={() => router.back()} disabled={showLoading}>
          <ArrowLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={tw`text-lg font-bold text-slate-900 ml-4`}>
          Request Work Order
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={tw`p-6 pb-24`}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info Banner */}
        <View
          style={tw`bg-sky-50 p-3 rounded-xl border border-sky-100 mb-4 flex-row items-center`}
        >
          <AlertTriangle size={18} color="#0284c7" style={tw`mr-2`} />
          <Text style={tw`text-xs text-sky-700 flex-1`}>
            Request akan dikirim ke Admin untuk persetujuan.
          </Text>
        </View>

        {/* Step 1: Customer Search - WAJIB PERTAMA */}
        <View style={tw`mb-4`}>
          <Text style={tw`text-xs font-bold text-slate-500 uppercase mb-2`}>
            1. Pilih Pelanggan *
          </Text>

          {selectedCustomer ? (
            // Selected Customer View
            <View
              style={tw`bg-green-50 p-4 rounded-xl border border-green-200`}
            >
              <View style={tw`flex-row justify-between items-start`}>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-base font-bold text-slate-900`}>
                    {selectedCustomer.fullname}
                  </Text>
                  <Text style={tw`text-sm text-slate-600 mt-1`}>
                    ID: {selectedCustomer.memberId} •{" "}
                    {selectedCustomer.username}
                  </Text>
                  <Text style={tw`text-sm text-slate-500 mt-1`}>
                    📞 {selectedCustomer.phone || "-"}
                  </Text>
                  <Text style={tw`text-sm text-slate-500`} numberOfLines={2}>
                    📍 {selectedCustomer.address || "-"}
                  </Text>
                  <Text style={tw`text-xs text-sky-600 mt-1`}>
                    {selectedCustomer.planName} • {selectedCustomer.ownerName}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={clearCustomer}
                  disabled={showLoading}
                >
                  <X size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // Search Input
            <View>
              <View style={tw`relative`}>
                <View style={tw`absolute left-3 top-3 z-10`}>
                  {searching ? (
                    <ActivityIndicator size="small" color="#0284c7" />
                  ) : (
                    <Search size={20} color="#94a3b8" />
                  )}
                </View>
                <TextInput
                  style={tw`bg-gray-50 p-3 pl-10 rounded-xl border border-gray-200`}
                  placeholder="Cari nama / username / ID pelanggan..."
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                  placeholderTextColor="#94a3b8"
                  editable={!showLoading}
                  autoCapitalize="none"
                />
              </View>

              {/* Search Results - only show when at least 2 chars typed */}
              {showSearchResults &&
                searchQuery.length >= 2 &&
                customers.length > 0 && (
                  <View
                    style={tw`bg-white border border-gray-200 rounded-xl mt-1 max-h-64 overflow-hidden shadow-lg`}
                  >
                    <ScrollView nestedScrollEnabled>
                      {customers.map((customer) => (
                        <TouchableOpacity
                          key={customer.id}
                          onPress={() => selectCustomer(customer)}
                          style={tw`p-3 border-b border-gray-100`}
                        >
                          <View style={tw`flex-row items-start`}>
                            <User
                              size={16}
                              color="#64748b"
                              style={tw`mr-2 mt-1`}
                            />
                            <View style={tw`flex-1`}>
                              <Text style={tw`font-medium text-slate-900`}>
                                {customer.fullname}
                              </Text>
                              <Text style={tw`text-xs text-slate-500`}>
                                {customer.memberId} • {customer.phone || "-"}
                              </Text>
                              {customer.address && (
                                <Text
                                  style={tw`text-xs text-slate-400 mt-0.5`}
                                  numberOfLines={2}
                                >
                                  📍 {customer.address}
                                </Text>
                              )}
                            </View>
                            <Text style={tw`text-xs text-sky-600`}>
                              {customer.planName}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

              {showSearchResults &&
                customers.length === 0 &&
                !searching &&
                searchQuery.length >= 2 && (
                  <View style={tw`bg-gray-50 p-3 rounded-xl mt-1`}>
                    <Text style={tw`text-sm text-slate-500 text-center`}>
                      Pelanggan tidak ditemukan
                    </Text>
                  </View>
                )}
            </View>
          )}
        </View>

        {/* Show rest of form only after customer is selected */}
        {selectedCustomer && (
          <>
            {/* Step 2: Quick Actions - Template Masalah */}
            <View style={tw`mb-6`}>
              <Text style={tw`text-xs font-bold text-slate-500 uppercase mb-2`}>
                2. Pilih Masalah
              </Text>
              <View style={tw`flex-row gap-3`}>
                {QUICK_ACTIONS.map((action, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => applyQuickAction(action)}
                    style={[
                      tw`flex-1 p-4 rounded-xl border-2`,
                      title.includes(action.title)
                        ? tw`bg-sky-50 border-sky-500`
                        : tw`bg-gray-50 border-gray-200`,
                    ]}
                    disabled={showLoading}
                  >
                    <View style={tw`items-center`}>
                      {action.title === "FOC / UT" ? (
                        <Wifi
                          size={28}
                          color={
                            title.includes(action.title) ? "#0284c7" : "#64748b"
                          }
                        />
                      ) : action.title === "Relokasi" ? (
                        <Truck
                          size={28}
                          color={
                            title.includes(action.title) ? "#0284c7" : "#64748b"
                          }
                        />
                      ) : (
                        <Wrench
                          size={28}
                          color={
                            title.includes(action.title) ? "#0284c7" : "#64748b"
                          }
                        />
                      )}
                      <Text
                        style={tw`text-sm font-bold mt-2 text-center ${title.includes(action.title) ? "text-sky-700" : "text-slate-700"}`}
                      >
                        {action.title}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Title */}
            <View style={tw`mb-4`}>
              <Text style={tw`text-xs font-bold text-slate-500 uppercase mb-2`}>
                Judul *
              </Text>
              <TextInput
                style={tw`bg-gray-50 p-3 rounded-xl border border-gray-200`}
                placeholder="Judul Work Order"
                value={title}
                onChangeText={setTitle}
                placeholderTextColor="#94a3b8"
                editable={!showLoading}
              />
            </View>

            {/* Description */}
            <View style={tw`mb-4`}>
              <Text style={tw`text-xs font-bold text-slate-500 uppercase mb-2`}>
                Deskripsi *
              </Text>
              <TextInput
                style={[
                  tw`bg-gray-50 p-3 rounded-xl border border-gray-200`,
                  { minHeight: 100, textAlignVertical: "top" },
                ]}
                placeholder="Jelaskan masalah..."
                multiline
                value={description}
                onChangeText={setDescription}
                placeholderTextColor="#94a3b8"
                editable={!showLoading}
              />
            </View>

            {/* Notes */}
            <View style={tw`mb-6`}>
              <Text style={tw`text-xs font-bold text-slate-500 uppercase mb-2`}>
                Catatan Tambahan
              </Text>
              <TextInput
                style={[
                  tw`bg-gray-50 p-3 rounded-xl border border-gray-200`,
                  { minHeight: 60, textAlignVertical: "top" },
                ]}
                placeholder="Informasi tambahan (opsional)"
                multiline
                value={notes}
                onChangeText={setNotes}
                placeholderTextColor="#94a3b8"
                editable={!showLoading}
              />
            </View>
          </>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={showLoading || !isFormValid}
          style={[
            tw`py-4 rounded-xl items-center shadow-sm`,
            !isFormValid || showLoading ? tw`bg-gray-300` : tw`bg-sky-600`,
          ]}
        >
          <Text style={tw`text-white font-bold text-lg`}>
            {showLoading ? "Memproses..." : "Kirim Request"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Loading Modal */}
      <LoadingModal visible={showLoading} message={loadingMessage} />
    </SafeAreaView>
  );
}
