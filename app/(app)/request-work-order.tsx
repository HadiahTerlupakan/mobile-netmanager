import SelectionModal from "@/components/molecules/SelectionModal";
import LoadingModal from "@/components/molecules/LoadingModal";
import { useOfflineMutationCompat as useOfflineMutation } from "@/hooks/queries";
import api from "@/services/api";
import { RequestWorkOrderSchema, sanitizeInput, validateData } from "@/utils/validation";
import { useRouter } from "expo-router";
import debounce from "lodash/debounce";
import {
    AlertTriangle,
    ArrowLeft,
    Building2,
    Cable,
    ChevronDown,
    LucideIcon,
    Search,
    Truck,
    User,
    Wifi,
    Wrench,
    X,
    Zap,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
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
import { logger } from "@/utils/logger";

interface QuickAction {
  title: string;
  type: string;
  priority: string;
  description: string;
  icon?: LucideIcon;
}

// Quick Actions untuk Customer
const CUSTOMER_QUICK_ACTIONS: QuickAction[] = [
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

// Quick Actions untuk Internal FOC
const INTERNAL_QUICK_ACTIONS: QuickAction[] = [
  {
    title: "Patching ODC/ODP",
    type: "MAINTENANCE",
    priority: "NORMAL",
    description: "Patching kabel di ODC atau ODP",
    icon: Cable,
  },
  {
    title: "Instalasi Kabel",
    type: "INSTALLATION",
    priority: "NORMAL",
    description: "Penarikan dan instalasi kabel FO baru",
    icon: Zap,
  },
  {
    title: "Perbaikan Putus",
    type: "TROUBLESHOOT",
    priority: "HIGH",
    description: "Perbaikan kabel FO putus di jalur backbone/feeder",
    icon: Wrench,
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
  isOnline?: boolean;
}

interface Department {
  id: string;
  name: string;
  code?: string;
}

export default function RequestWorkOrderScreen() {
  const router = useRouter();

  // WO Mode: Customer vs Internal
  const [woMode, setWoMode] = useState<"CUSTOMER" | "INTERNAL">("CUSTOMER");

  // Form State
  const [type, setType] = useState("TROUBLESHOOT");
  const [priority, setPriority] = useState("HIGH");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  // Internal Mode State - Department
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] =
    useState<Department | null>(null);
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  // Customer Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState<MixRadiusCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] =
    useState<MixRadiusCustomer | null>(null);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // UI State
  const [showLoading, setShowLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  // Offline Mutation
  const { mutate } = useOfflineMutation();

  // Fetch departments when switching to Internal mode
  useEffect(() => {
    if (woMode === "INTERNAL" && departments.length === 0) {
      fetchDepartments();
    }
  }, [woMode, departments.length]);

  const fetchDepartments = async () => {
    setLoadingDepartments(true);
    try {
      const res = await api.get("/api/mobile/departments");
      setDepartments(res.data?.data || []);
    } catch (error) {
      logger.error("Failed to fetch departments:", error);
    } finally {
      setLoadingDepartments(false);
    }
  };

  // Reset form when switching mode
  const handleModeChange = (mode: "CUSTOMER" | "INTERNAL") => {
    setWoMode(mode);
    // Reset form
    setTitle("");
    setDescription("");
    setNotes("");
    setPriority("HIGH");
    // Reset customer
    setSelectedCustomer(null);
    setSearchQuery("");
    setCustomers([]);
    // Reset department
    setSelectedDepartment(null);
  };

  // Search Customers from MixRadius
  const searchCustomers = useMemo(
    () => debounce(async (query: string) => {
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
        logger.error("Search failed:", error);
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

  // Select customer
  const selectCustomer = (customer: MixRadiusCustomer) => {
    setSelectedCustomer(customer);
    setShowSearchResults(false);
    setSearchQuery(customer.fullname);
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

  // Select department
  const selectDepartment = (dept: Department) => {
    setSelectedDepartment(dept);
    setShowDepartmentPicker(false);
  };

  // Apply Quick Action Template
  const applyQuickAction = (action: {
    title: string;
    type: string;
    priority: string;
    description: string;
  }) => {
    setType(action.type);
    setPriority(action.priority);
    setDescription(action.description);

    if (woMode === "CUSTOMER" && selectedCustomer) {
      setTitle(`${action.title} - ${selectedCustomer.fullname}`);
    } else if (woMode === "INTERNAL" && selectedDepartment) {
      setTitle(`${action.title} - ${selectedDepartment.name}`);
    } else {
      setTitle(action.title);
    }
  };

  // Submit Handler
  const handleSubmit = async () => {
    // Validations based on mode
    if (woMode === "CUSTOMER") {
      if (!selectedCustomer) {
        Alert.alert("Error", "Pilih pelanggan terlebih dahulu");
        return;
      }
    } else {
      if (!selectedDepartment) {
        Alert.alert("Error", "Pilih Department terlebih dahulu");
        return;
      }
    }

    // 1. Validate & Sanitize Input
    const rawData = {
        title: sanitizeInput(title),
        description: sanitizeInput(description),
        notes: sanitizeInput(notes)
    };

    const validation = validateData(RequestWorkOrderSchema, rawData);

    if (!validation.success) {
        Alert.alert("Data Tidak Valid", validation.error);
        return;
    }

    setShowLoading(true);
    setLoadingMessage("Mengirim request...");

    try {
      const validData = validation.data;
      const payload =
        woMode === "CUSTOMER"
          ? {
              type,
              priority,
              title: validData.title,
              description: validData.description,
              isInternal: false,
              contactName: selectedCustomer!.fullname,
              contactPhone: selectedCustomer!.phone,
              locationAddress: selectedCustomer!.address,
              notes:
                validData.notes ||
                `Pelanggan: ${selectedCustomer!.username} (${selectedCustomer!.memberId})\nPaket: ${selectedCustomer!.planName}\nOwner: ${selectedCustomer!.ownerName}`,
              mixRadiusCustomerId: selectedCustomer!.id,
              mixRadiusMemberId: selectedCustomer!.memberId,
            }
          : {
              type,
              priority,
              title: validData.title,
              description: validData.description,
              isInternal: true,
              departmentId: selectedDepartment!.id,
              contactName: selectedDepartment!.name, // Department name as contact
              notes: validData.notes || undefined,
            };

      await mutate(payload, {
        url: "/api/mobile/work-orders/request",
        method: "POST",
        onSuccess: (data, isOffline) => {
          setShowLoading(false);
          // Reset form
          setType("TROUBLESHOOT");
          setPriority("HIGH");
          setTitle("");
          setDescription("");
          setNotes("");
          setSelectedCustomer(null);
          setSearchQuery("");
          setCustomers([]);
          setSelectedDepartment(null);

          Alert.alert(
            isOffline ? "Offline" : "Berhasil! ✅",
            isOffline
              ? "Request diantrikan dan akan dikirim saat online"
              : `Request WO ${woMode === "INTERNAL" ? "Internal " : ""}berhasil dikirim.\nMenunggu persetujuan Admin.`,
            [{ text: "OK", onPress: () => router.back() }],
          );
        },
        onError: (err) => {
          setShowLoading(false);
          Alert.alert("Error", err.message || "Gagal mengirim request");
        },
      });
    } catch {
      setShowLoading(false);
      Alert.alert("Error", "Terjadi kesalahan");
    }
  };

  const isFormValid =
    woMode === "CUSTOMER"
      ? selectedCustomer && title.trim() && description.trim()
      : selectedDepartment && title.trim() && description.trim();

  const currentQuickActions =
    woMode === "CUSTOMER" ? CUSTOMER_QUICK_ACTIONS : INTERNAL_QUICK_ACTIONS;
  const showTemplates =
    (woMode === "CUSTOMER" && selectedCustomer) ||
    (woMode === "INTERNAL" && selectedDepartment);

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
        {/* Mode Toggle: Customer vs Internal */}
        <View style={tw`mb-4`}>
          <View style={tw`flex-row bg-gray-100 rounded-xl p-1`}>
            <TouchableOpacity
              onPress={() => handleModeChange("CUSTOMER")}
              style={[
                tw`flex-1 py-3 rounded-lg flex-row items-center justify-center`,
                woMode === "CUSTOMER"
                  ? tw`bg-white shadow-sm`
                  : tw`bg-transparent`,
              ]}
              disabled={showLoading}
            >
              <User
                size={18}
                color={woMode === "CUSTOMER" ? "#0284c7" : "#64748b"}
              />
              <Text
                style={[
                  tw`ml-2 font-semibold`,
                  woMode === "CUSTOMER" ? tw`text-sky-600` : tw`text-slate-500`,
                ]}
              >
                Customer
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleModeChange("INTERNAL")}
              style={[
                tw`flex-1 py-3 rounded-lg flex-row items-center justify-center`,
                woMode === "INTERNAL"
                  ? tw`bg-white shadow-sm`
                  : tw`bg-transparent`,
              ]}
              disabled={showLoading}
            >
              <Building2
                size={18}
                color={woMode === "INTERNAL" ? "#f97316" : "#64748b"}
              />
              <Text
                style={[
                  tw`ml-2 font-semibold`,
                  woMode === "INTERNAL"
                    ? tw`text-orange-500`
                    : tw`text-slate-500`,
                ]}
              >
                Internal (FOC)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Banner */}
        <View
          style={[
            tw`p-3 rounded-xl border mb-4 flex-row items-center`,
            woMode === "INTERNAL"
              ? tw`bg-orange-50 border-orange-100`
              : tw`bg-sky-50 border-sky-100`,
          ]}
        >
          <AlertTriangle
            size={18}
            color={woMode === "INTERNAL" ? "#f97316" : "#0284c7"}
            style={tw`mr-2`}
          />
          <Text
            style={[
              tw`text-xs flex-1`,
              woMode === "INTERNAL" ? tw`text-orange-700` : tw`text-sky-700`,
            ]}
          >
            {woMode === "INTERNAL"
              ? "WO Internal untuk pekerjaan FOC tanpa pelanggan."
              : "Request akan dikirim ke Admin untuk persetujuan."}
          </Text>
        </View>

        {/* CUSTOMER MODE: Search Pelanggan */}
        {woMode === "CUSTOMER" && (
          <View style={tw`mb-4`}>
            <Text style={tw`text-xs font-bold text-slate-500 uppercase mb-2`}>
              1. Pilih Pelanggan *
            </Text>

            {selectedCustomer ? (
              <View
                style={tw`bg-green-50 p-4 rounded-xl border border-green-200`}
              >
                <View style={tw`flex-row justify-between items-start`}>
                  <View style={tw`flex-1`}>
                    <View style={tw`flex-row items-center`}>
                      <Text style={tw`text-base font-bold text-slate-900`}>
                        {selectedCustomer.fullname}
                      </Text>
                      <View
                        style={[
                          tw`ml-2 px-2 py-0.5 rounded-full`,
                          selectedCustomer.isOnline
                            ? tw`bg-green-500`
                            : tw`bg-gray-400`,
                        ]}
                      >
                        <Text style={tw`text-xs text-white font-medium`}>
                          {selectedCustomer.isOnline ? "Online" : "Offline"}
                        </Text>
                      </View>
                    </View>
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
                              <View style={tw`mr-2 mt-1`}>
                                <View
                                  style={[
                                    tw`w-3 h-3 rounded-full`,
                                    customer.isOnline
                                      ? tw`bg-green-500`
                                      : tw`bg-gray-300`,
                                  ]}
                                />
                              </View>
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
                              <View style={tw`items-end`}>
                                <Text style={tw`text-xs text-sky-600`}>
                                  {customer.planName}
                                </Text>
                                <Text
                                  style={[
                                    tw`text-xs mt-0.5 font-medium`,
                                    customer.isOnline
                                      ? tw`text-green-600`
                                      : tw`text-gray-400`,
                                  ]}
                                >
                                  {customer.isOnline ? "Online" : "Offline"}
                                </Text>
                              </View>
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
        )}

        {/* INTERNAL MODE: Dropdown Department */}
        {woMode === "INTERNAL" && (
          <View style={tw`mb-4`}>
            <Text style={tw`text-xs font-bold text-slate-500 uppercase mb-2`}>
              1. Pilih Department *
            </Text>

            <TouchableOpacity
              onPress={() => setShowDepartmentPicker(true)}
              style={tw`bg-gray-50 p-4 rounded-xl border border-gray-200 flex-row items-center justify-between`}
              disabled={showLoading || loadingDepartments}
            >
              {loadingDepartments ? (
                <ActivityIndicator size="small" color="#f97316" />
              ) : selectedDepartment ? (
                <View style={tw`flex-row items-center flex-1`}>
                  <Building2 size={20} color="#f97316" />
                  <Text style={tw`ml-3 text-base font-medium text-slate-900`}>
                    {selectedDepartment.name}
                  </Text>
                </View>
              ) : (
                <Text style={tw`text-slate-400`}>Pilih Department...</Text>
              )}
              <ChevronDown size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        )}

        {/* Show templates after selection */}
        {showTemplates && (
          <>
            {/* Step 2: Quick Actions - Template */}
            <View style={tw`mb-6`}>
              <Text style={tw`text-xs font-bold text-slate-500 uppercase mb-2`}>
                2. Pilih {woMode === "INTERNAL" ? "Jenis Pekerjaan" : "Masalah"}
              </Text>
              <View style={tw`flex-row gap-3`}>
                {currentQuickActions.map((action, idx) => {
                  const isSelected = title.includes(action.title);
                  const IconComponent =
                    woMode === "INTERNAL" && action.icon
                      ? action.icon
                      : action.title === "FOC / UT"
                        ? Wifi
                        : action.title === "Relokasi"
                          ? Truck
                          : Wrench;

                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => applyQuickAction(action)}
                      style={[
                        tw`flex-1 p-4 rounded-xl border-2`,
                        isSelected
                          ? woMode === "INTERNAL"
                            ? tw`bg-orange-50 border-orange-500`
                            : tw`bg-sky-50 border-sky-500`
                          : tw`bg-gray-50 border-gray-200`,
                      ]}
                      disabled={showLoading}
                    >
                      <View style={tw`items-center`}>
                        <IconComponent
                          size={28}
                          color={
                            isSelected
                              ? woMode === "INTERNAL"
                                ? "#f97316"
                                : "#0284c7"
                              : "#64748b"
                          }
                        />
                        <Text
                          style={[
                            tw`text-xs font-bold mt-2 text-center`,
                            isSelected
                              ? woMode === "INTERNAL"
                                ? tw`text-orange-600`
                                : tw`text-sky-700`
                              : tw`text-slate-700`,
                          ]}
                          numberOfLines={2}
                        >
                          {action.title}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
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
                placeholder="Jelaskan detail pekerjaan..."
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
            !isFormValid || showLoading
              ? tw`bg-gray-300`
              : woMode === "INTERNAL"
                ? tw`bg-orange-500`
                : tw`bg-sky-600`,
          ]}
        >
          <Text style={tw`text-white font-bold text-lg`}>
            {showLoading
              ? "Memproses..."
              : `Kirim Request ${woMode === "INTERNAL" ? "Internal" : ""}`}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Department Picker Modal */}
      <SelectionModal
        visible={showDepartmentPicker}
        onClose={() => setShowDepartmentPicker(false)}
        title="Pilih Department"
        items={departments.map((dept) => ({
          id: dept.id,
          label: dept.name,
          value: dept,
        }))}
        onSelect={(item) => selectDepartment(item.value as Department)}
        selectedValue={selectedDepartment}
        loading={loadingDepartments}
      />

      {/* Loading Modal */}
      <LoadingModal visible={showLoading} message={loadingMessage} />
    </SafeAreaView>
  );
}
