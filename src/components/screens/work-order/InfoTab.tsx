import { WorkOrder } from '@/types/work-order';
import { formatDate } from '@/utils/date';
import {
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  Phone,
  User,
  X,
} from 'lucide-react-native';
import React from 'react';
import { Linking, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

interface InfoTabProps {
  wo: WorkOrder;
  user: { id?: string } | null;
  isMitraTeknisi: boolean;
  actionLoading: boolean;
  handlePartnerResponse: (response: 'APPROVED' | 'REJECTED') => void;
  handleRemovePartner: (assignmentId: string) => void;
  setIsPartnerModalVisible: (visible: boolean) => void;
}

/** Tab Info: status, deskripsi, jadwal, kontak, tim */
export const InfoTab = React.memo(function InfoTab({
  wo,
  user,
  isMitraTeknisi,
  actionLoading,
  handlePartnerResponse,
  handleRemovePartner,
  setIsPartnerModalVisible,
}: InfoTabProps) {
  return (
    <View>
      <View>
        {/* Warranty Banner */}
        {wo.isWarranty && wo.warrantyOwnerId === user?.id && (
          <View style={tw`bg-red-50 p-4 rounded-xl shadow-sm mb-4 border border-red-200`}>
            <View style={tw`flex-row items-center mb-2`}>
              <Text style={tw`text-red-600 font-bold ml-1`}>⚠️ Tiket Garansi SLA</Text>
            </View>
            <Text style={tw`text-sm text-red-700 mb-2 leading-5`}>
              Pekerjaan ini merupakan garansi dari perbaikan Anda sebelumnya. Silahkan selesaikan sebelum batas waktu SLA habis.
            </Text>
            {wo.warrantySla && (
              <View style={tw`bg-red-100 p-2 rounded flex-row items-center`}>
                <Clock size={14} color="#dc2626" style={tw`mr-2`} />
                <Text style={tw`text-xs font-bold text-red-600`}>
                  Batas Waktu: {formatDate(wo.warrantySla, "dd MMM yyyy, HH:mm")}
                </Text>
              </View>
            )}
            <Text style={tw`text-xs text-red-500 mt-2 italic flex-row flex-wrap`}>
              * Jika melewati batas SLA, tiket akan dilelang. Dan jika diambil mitra lain, Anda akan dikenakan denda.
            </Text>
          </View>
        )}

        {/* Status Card */}
        <View style={tw`bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100`}>
          <View style={tw`flex-row justify-between mb-2`}>
            <Text style={tw`text-xs text-gray-400 font-bold uppercase`}>
              Jadwal & Status
            </Text>
            <Text
              style={tw`text-xs font-bold ${wo.priority === "URGENT" ? "text-red-600" : "text-gray-500"}`}
            >
              {wo.priority}
            </Text>
          </View>
          <View style={tw`flex-row items-center justify-between`}>
            <View
              style={tw`px-3 py-1 rounded-full ${wo.status === "IN_PROGRESS"
                ? "bg-blue-100"
                : wo.status === "COMPLETED"
                  ? "bg-green-100"
                  : "bg-gray-100"
                }`}
            >
              <Text
                style={tw`font-bold ${wo.status === "IN_PROGRESS"
                  ? "text-blue-700"
                  : wo.status === "COMPLETED"
                    ? "text-green-700"
                    : "text-gray-700"
                  }`}
              >
                {wo.status}
              </Text>
            </View>
            {wo.scheduledDate && (
              <View style={tw`flex-row items-center bg-gray-50 px-3 py-1 rounded-lg`}>
                <Calendar size={14} color="#6b7280" style={tw`mr-1`} />
                <Text style={tw`text-xs text-gray-700 font-medium`}>
                  {formatDate(wo.scheduledDate, "dd MMM yyyy, HH:mm")}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Description Card */}
        <View style={tw`bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100`}>
          <Text style={tw`text-xs text-gray-400 font-bold mb-2 uppercase`}>
            Deskripsi Pekerjaan
          </Text>
          <Text style={tw`font-bold text-gray-800 text-lg mb-2`}>
            {wo.title}
          </Text>
          <Text style={tw`text-sm text-gray-600 leading-6 bg-gray-50 p-3 rounded-lg`}>
            {wo.description || "Tidak ada deskripsi"}
          </Text>
        </View>

        {/* Schedule & Location Card */}
        <View style={tw`bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100`}>
          <View style={tw`flex-row mb-4`}>
            <Clock size={20} color="#2563eb" style={tw`mt-0.5 mr-3`} />
            <View>
              <Text style={tw`text-xs text-gray-400 mb-0.5`}>Jadwal</Text>
              {wo.scheduledDate ? (
                <>
                  <Text style={tw`text-sm font-bold text-gray-800`}>
                    {formatDate(wo.scheduledDate, "EEEE, dd MMMM yyyy")}
                  </Text>
                  <Text style={tw`text-xs text-gray-500`}>
                    Pukul {formatDate(wo.scheduledDate, "HH:mm")} WIB
                  </Text>
                </>
              ) : (
                <Text style={tw`text-sm text-gray-400 italic`}>
                  Belum dijadwalkan
                </Text>
              )}
            </View>
          </View>

          {wo.startedAt && (
            <View style={tw`flex-row mb-4 ml-8`}>
              <View>
                <Text style={tw`text-xs text-gray-400 mb-0.5`}>Waktu Mulai</Text>
                <Text style={tw`text-sm font-bold text-green-600`}>
                  {formatDate(wo.startedAt, "EEEE, dd MMMM yyyy • HH.mm")}
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={() => {
              const address = wo.locationAddress || wo.pelanggan?.alamat;
              if (address) {
                const query = encodeURIComponent(address);
                Linking.openURL(
                  `https://www.google.com/maps/search/?api=1&query=${query}`,
                );
              }
            }}
            style={tw`flex-row`}
          >
            <MapPin size={20} color="#dc2626" style={tw`mt-0.5 mr-3`} />
            <View style={tw`flex-1`}>
              <Text style={tw`text-xs text-gray-400 mb-0.5`}>Lokasi</Text>
              <Text style={tw`text-sm font-bold text-blue-600 leading-5`}>
                {wo.locationAddress || wo.pelanggan?.alamat || "-"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Contact Card */}
        {(wo.contactName ||
          wo.pelanggan?.nama ||
          wo.contactPhone ||
          wo.pelanggan?.noTelp) && (
          <View style={tw`bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100`}>
            <Text style={tw`text-xs text-gray-400 font-bold mb-3 uppercase`}>
              Kontak
            </Text>

            {(wo.contactName || wo.pelanggan?.nama) && (
              <View style={tw`flex-row items-center mb-3`}>
                <User size={18} color="#6b7280" style={tw`mr-3`} />
                <View>
                  <Text style={tw`text-xs text-gray-400`}>Nama</Text>
                  <Text style={tw`text-sm font-bold text-gray-800`}>
                    {wo.contactName || wo.pelanggan?.nama}
                  </Text>
                </View>
              </View>
            )}

            {(wo.contactPhone || wo.pelanggan?.noTelp) && (
              <TouchableOpacity
                onPress={() => {
                  const phone = wo.contactPhone || wo.pelanggan?.noTelp;
                  if (phone) {
                    let formattedPhone = phone.replace(/\D/g, "");
                    if (formattedPhone.startsWith("0")) {
                      formattedPhone = "62" + formattedPhone.substring(1);
                    } else if (formattedPhone.startsWith("8")) {
                      formattedPhone = "62" + formattedPhone;
                    }

                    Linking.openURL(
                      `whatsapp://send?phone=${formattedPhone}`,
                    ).catch(() => {
                      Linking.openURL(`tel:${phone}`);
                    });
                  }
                }}
                style={tw`flex-row items-center`}
              >
                <Phone size={18} color="#2563eb" style={tw`mr-3`} />
                <View>
                  <Text style={tw`text-xs text-gray-400`}>Telepon</Text>
                  <Text style={tw`text-sm font-bold text-blue-600`}>
                    {wo.contactPhone || wo.pelanggan?.noTelp}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Team & Partners Card */}
        {!isMitraTeknisi && (
          <View style={tw`bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100`}>
            <View style={tw`flex-row justify-between items-center mb-3`}>
              <Text style={tw`text-xs text-gray-400 font-bold uppercase`}>
                Tim Pengerjaan
              </Text>
              {wo.status !== "COMPLETED" && wo.status !== "CLOSED" && !isMitraTeknisi && (
                <TouchableOpacity onPress={() => setIsPartnerModalVisible(true)}>
                  <Text style={tw`text-xs font-bold text-blue-600`}>
                    + Tambah
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Primary Assigned */}
            {(wo.assignedTo || wo.assignedMitra) && (
              <View style={tw`flex-row items-center mb-3 bg-blue-50 p-2 rounded-lg`}>
                <View style={tw`w-8 h-8 bg-blue-200 rounded-full items-center justify-center mr-3`}>
                  <Text style={tw`font-bold text-blue-700`}>
                    {(wo.assignedTo || wo.assignedMitra)?.name?.charAt(0)}
                  </Text>
                </View>
                <View style={tw`flex-1`}>
                  <Text style={tw`font-bold text-gray-800 text-sm`}>
                    {(wo.assignedTo || wo.assignedMitra)?.name}
                  </Text>
                  <Text style={tw`text-xs text-blue-600`}>
                    {wo.assignedMitra ? 'Mitra Lead Teknisi' : 'Lead Teknisi'}
                  </Text>
                </View>
              </View>
            )}

            {/* Partners */}
            {wo.assignments
              ?.filter((a) => a.userId !== wo.assignedToId)
              .map((assignment) => (
                <View
                  key={assignment.id}
                  style={tw`flex-row items-center justify-between mb-2 pb-2 border-b border-gray-50 last:border-0`}
                >
                  <View style={tw`flex-row items-center flex-1`}>
                    <View style={tw`w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3`}>
                      <Text style={tw`font-bold text-blue-600`}>
                        {assignment.user?.name?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={tw`flex-1`}>
                      <Text style={tw`font-bold text-gray-800 text-sm`}>
                        {assignment.user?.name}
                      </Text>
                      <View style={tw`flex-row items-center mt-0.5`}>
                        <Text style={tw`text-xs text-gray-500 mr-2`}>
                          {assignment.role || "Partner"}
                        </Text>
                        <View
                          style={tw`px-2 py-0.5 rounded-full ${assignment.status === "APPROVED"
                            ? "bg-green-100"
                            : assignment.status === "REJECTED"
                              ? "bg-red-100"
                              : "bg-yellow-100"
                            }`}
                        >
                          <Text
                            style={tw`text-[10px] font-bold ${assignment.status === "APPROVED"
                              ? "text-green-700"
                              : assignment.status === "REJECTED"
                                ? "text-red-700"
                                : "text-yellow-700"
                              }`}
                          >
                            {assignment.status === "APPROVED"
                              ? "Setuju"
                              : assignment.status === "REJECTED"
                                ? "Tolak"
                                : "Menunggu"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Action Buttons for Pending Partner (Only if it's me) */}
                  {assignment.status === "PENDING" &&
                    assignment.userId === user?.id && (
                      <View style={tw`flex-row gap-2`}>
                        <TouchableOpacity
                          onPress={() => handlePartnerResponse("REJECTED")}
                          disabled={actionLoading}
                          style={tw`bg-red-50 p-2 rounded-lg border border-red-100`}
                        >
                          <X size={16} color="#ef4444" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handlePartnerResponse("APPROVED")}
                          disabled={actionLoading}
                          style={tw`bg-green-50 p-2 rounded-lg border border-green-100`}
                        >
                          <CheckCircle size={16} color="#16a34a" />
                        </TouchableOpacity>
                      </View>
                    )}

                  {/* Delete Button (Only for Creator/Assigner or if not me) */}
                  {(!assignment.status ||
                    assignment.status === "APPROVED" ||
                    assignment.status === "PENDING") &&
                    assignment.userId !== user?.id &&
                    wo.status !== "COMPLETED" && (
                      <TouchableOpacity
                        onPress={() => handleRemovePartner(assignment.id)}
                        style={tw`p-2`}
                      >
                        <X size={16} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                </View>
              ))}

            {(!wo.assignments || wo.assignments.length <= 1) &&
              !wo.assignedTo && (
                <Text style={tw`text-gray-400 text-xs italic`}>
                  Belum ada tim yang ditugaskan
                </Text>
              )}
          </View>
        )}
      </View>
    </View>
  );
});
