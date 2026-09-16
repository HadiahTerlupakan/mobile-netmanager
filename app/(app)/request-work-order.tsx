import {
  CustomerContactFields,
  CustomerContactFormValues,
} from "@/components/molecules/CustomerContactFields";
import LoadingModal from "@/components/molecules/LoadingModal";
import SelectionModal from "@/components/molecules/SelectionModal";
import { isOfflineMutationQueuedResult, useApiQuery, useCreateWorkOrderRequest } from "@/hooks/queries";
import { presentAppError, presentInfoMessage, presentSuccessMessage } from "@/utils/errorPresenter";
import { logger } from "@/utils/logger";
import {
  CONTACT_NAME_MIN_LENGTH,
  RequestWorkOrderContact,
  RequestWorkOrderContactSchema,
  RequestWorkOrderSchema,
  sanitizeInput,
  validateData,
} from "@/utils/validation";
import { useRouter } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Cable,
  ChevronDown,
  LucideIcon,
  Truck,
  User,
  Wifi,
  Wrench,
  Zap,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { useFeatureGuard } from '@/hooks/useFeatureGuard';
import { AppFeature } from '@/constants/features';

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

interface Department {
  id: string;
  name: string;
  code?: string;
}

const EMPTY_CUSTOMER_CONTACT: CustomerContactFormValues = {
  contactName: "",
  contactPhone: "",
  locationAddress: "",
};

export default function RequestWorkOrderScreen() {
  useFeatureGuard(AppFeature.WORK_ORDER);

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
  const [selectedDepartment, setSelectedDepartment] =
    useState<Department | null>(null);
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);

  // Use useApiQuery for departments
  const {
    data: departmentsData,
    isPending: loadingDepartments,
    isError: isDepartmentsError,
    error: departmentsError,
  } = useApiQuery<Department[]>({
    queryKey: ["departments"],
    endpoint: "/api/mobile/departments",
    enabled: woMode === "INTERNAL",
    select: (data: any) => data?.data || [],
  });

  useEffect(() => {
    if (isDepartmentsError && departmentsError) {
      logger.error("Failed to fetch departments:", departmentsError);
      presentInfoMessage("Gagal memuat data department", "Error");
    }
  }, [isDepartmentsError, departmentsError]);

  const departments = departmentsData || [];

  // Customer Mode State - kontak pelanggan diisi manual
  const [customerContact, setCustomerContact] =
    useState<CustomerContactFormValues>(EMPTY_CUSTOMER_CONTACT);
  const hasContactName =
    customerContact.contactName.trim().length >= CONTACT_NAME_MIN_LENGTH;

  // UI State
  const [showLoading, setShowLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  // Offline Mutation
  const { mutate } = useCreateWorkOrderRequest();

  // Reset form when switching mode
  const handleModeChange = (mode: "CUSTOMER" | "INTERNAL") => {
    setWoMode(mode);
    // Reset form
    setTitle("");
    setDescription("");
    setNotes("");
    setPriority("HIGH");
    // Reset customer contact
    setCustomerContact(EMPTY_CUSTOMER_CONTACT);
    // Reset department
    setSelectedDepartment(null);
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

    if (woMode === "CUSTOMER" && hasContactName) {
      setTitle(`${action.title} - ${customerContact.contactName.trim()}`);
    } else if (woMode === "INTERNAL" && selectedDepartment) {
      setTitle(`${action.title} - ${selectedDepartment.name}`);
    } else {
      setTitle(action.title);
    }
  };

  // Submit Handler
  const handleSubmit = async () => {
    // Validations based on mode (kontak hanya terisi di mode Customer)
    let validCustomerContact: RequestWorkOrderContact | null = null;
    if (woMode === "CUSTOMER") {
      const contactValidation = validateData(RequestWorkOrderContactSchema, {
        contactName: sanitizeInput(customerContact.contactName),
        contactPhone: sanitizeInput(customerContact.contactPhone),
        locationAddress: sanitizeInput(customerContact.locationAddress),
      });
      if (!contactValidation.success) {
        presentInfoMessage(contactValidation.error, "Data Tidak Valid");
        return;
      }
      validCustomerContact = contactValidation.data;
    } else if (!selectedDepartment) {
      presentInfoMessage("Pilih Department terlebih dahulu", "Error");
      return;
    }

    // 1. Validate & Sanitize Input
    const rawData = {
      title: sanitizeInput(title),
      description: sanitizeInput(description),
      notes: sanitizeInput(notes)
    };

    const validation = validateData(RequestWorkOrderSchema, rawData);

    if (!validation.success) {
      presentInfoMessage(validation.error, "Data Tidak Valid");
      return;
    }

    setShowLoading(true);
    setLoadingMessage("Mengirim request...");

    try {
      const validData = validation.data;
      const payload =
        validCustomerContact
          ? {
            type,
            priority,
            title: validData.title,
            description: validData.description,
            isInternal: false,
            contactName: validCustomerContact.contactName,
            contactPhone: validCustomerContact.contactPhone || undefined,
            locationAddress: validCustomerContact.locationAddress || undefined,
            notes: validData.notes || undefined,
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
        onSuccess: (data) => {
          setShowLoading(false);
          const isOffline = isOfflineMutationQueuedResult(data);

          // Reset form
          setType("TROUBLESHOOT");
          setPriority("HIGH");
          setTitle("");
          setDescription("");
          setNotes("");
          setCustomerContact(EMPTY_CUSTOMER_CONTACT);
          setSelectedDepartment(null);

          if (isOffline) {
            presentInfoMessage("Request diantrikan dan akan dikirim saat online", "Offline");
          } else {
            presentSuccessMessage(`Request WO ${woMode === "INTERNAL" ? "Internal " : ""}berhasil dikirim. Menunggu persetujuan Admin.`);
          }
          router.back();
        },
        onError: (err) => {
          setShowLoading(false);
          presentAppError(err, {
            screen: 'RequestWorkOrderScreen',
            route: '/(app)/request-work-order',
          });
        },
      });
    } catch (error) {
      setShowLoading(false);
      presentAppError(error, {
        screen: 'RequestWorkOrderScreen',
        route: '/(app)/request-work-order',
      });
    }
  };

  const isFormValid =
    woMode === "CUSTOMER"
      ? hasContactName && title.trim() && description.trim()
      : selectedDepartment && title.trim() && description.trim();

  const currentQuickActions =
    woMode === "CUSTOMER" ? CUSTOMER_QUICK_ACTIONS : INTERNAL_QUICK_ACTIONS;
  const showTemplates =
    (woMode === "CUSTOMER" && hasContactName) ||
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

        {/* CUSTOMER MODE: Kontak pelanggan diisi manual */}
        {woMode === "CUSTOMER" && (
          <View style={tw`mb-4`}>
            <Text style={tw`text-xs font-bold text-slate-500 uppercase mb-2`}>
              1. Data Pelanggan *
            </Text>
            <CustomerContactFields
              values={customerContact}
              onChange={setCustomerContact}
              disabled={showLoading}
            />
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
                      key={action.title}
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

        <TouchableOpacity
          activeOpacity={0.8}
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
