import { MapPin, Phone, User } from 'lucide-react-native';
import React, { memo } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View, Linking } from 'react-native';
import tw from 'twrnc';

interface AvailableWorkOrderListItemProps {
    item: {
        id: string;
        workOrderNumber: string;
        title: string;
        contactName?: string | null;
        contactPhone?: string | null;
        locationAddress?: string | null;
        type: string;
        priority: string;
        pelanggan?: {
            nama?: string | null;
            noTelp?: string | null;
            alamat?: string | null;
        };
        site?: {
            name?: string | null;
        };
    };
    onClaim: (id: string) => void;
    isClaiming: boolean;
}

const AvailableWorkOrderListItem = memo(({ item, onClaim, isClaiming }: AvailableWorkOrderListItemProps) => {
    const handlePhonePress = () => {
        const phone = item.contactPhone || item.pelanggan?.noTelp;
        if (phone) {
            let formatPhone = phone.replace(/\D/g, "");
            if (formatPhone.startsWith("0"))
                formatPhone = "62" + formatPhone.substring(1);
            Linking.openURL(`whatsapp://send?phone=${formatPhone}`).catch(() => 
                Linking.openURL(`tel:${phone}`)
            );
        }
    };

    const handleAddressPress = () => {
        const address = item.locationAddress || item.pelanggan?.alamat || item.site?.name;
        if (address) {
            const query = encodeURIComponent(address);
            Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
        }
    };

    return (
        <View style={tw`bg-white mt-3 p-4 rounded-xl shadow-sm border border-blue-100`}>
            {/* Header: WO Number & Status */}
            <View style={tw`flex-row justify-between items-start mb-2`}>
                <Text style={tw`font-bold text-gray-800`}>
                    {item.workOrderNumber}
                </Text>
                <View style={tw`px-2 py-0.5 rounded-full bg-yellow-100`}>
                    <Text style={tw`text-xs font-bold text-yellow-700`}>
                        TERSEDIA
                    </Text>
                </View>
            </View>

            {/* Title */}
            <Text
                style={tw`text-base font-semibold text-gray-900 mb-3`}
                numberOfLines={2}
            >
                {item.title}
            </Text>

            {/* Contact Info */}
            {(item.contactName || item.pelanggan?.nama) && (
                <View style={tw`flex-row items-center mb-2`}>
                    <User size={14} color="#6b7280" style={tw`mr-2`} />
                    <Text style={tw`text-sm text-gray-700 font-medium`}>
                        {item.contactName || item.pelanggan?.nama}
                    </Text>
                </View>
            )}

            {/* Phone - Tappable */}
            {(item.contactPhone || item.pelanggan?.noTelp) && (
                <TouchableOpacity
                    onPress={handlePhonePress}
                    style={tw`flex-row items-center mb-2`}
                >
                    <Phone size={14} color="#2563eb" style={tw`mr-2`} />
                    <Text style={tw`text-sm text-blue-600 font-medium`}>
                        {item.contactPhone || item.pelanggan?.noTelp}
                    </Text>
                </TouchableOpacity>
            )}

            {/* Location */}
            {(item.locationAddress || item.pelanggan?.alamat || item.site?.name) && (
                <TouchableOpacity
                    onPress={handleAddressPress}
                    style={tw`flex-row items-start mb-3`}
                >
                    <MapPin size={14} color="#dc2626" style={tw`mr-2 mt-0.5`} />
                    <Text
                        style={tw`text-sm text-gray-600 flex-1`}
                        numberOfLines={2}
                    >
                        {item.locationAddress || item.pelanggan?.alamat || item.site?.name}
                    </Text>
                </TouchableOpacity>
            )}

            {/* Tags & Ambil Button */}
            <View
                style={tw`flex-row items-center justify-between pt-2 border-t border-gray-100`}
            >
                <View style={tw`flex-row gap-2`}>
                    <View style={tw`px-2 py-0.5 rounded bg-gray-100`}>
                        <Text style={tw`text-xs text-gray-600`}>{item.type}</Text>
                    </View>
                    <View
                        style={tw`px-2 py-0.5 rounded ${item.priority === "HIGH" || item.priority === "URGENT" || item.priority === "CRITICAL" ? "bg-red-100" : "bg-blue-100"}`}
                    >
                        <Text
                            style={tw`text-xs ${item.priority === "HIGH" || item.priority === "URGENT" || item.priority === "CRITICAL" ? "text-red-600" : "text-blue-600"}`}
                        >
                            {item.priority}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => onClaim(item.id)}
                    disabled={isClaiming}
                    style={tw`bg-blue-600 px-4 py-2 rounded-lg ${isClaiming ? "opacity-50" : ""}`}
                >
                    {isClaiming ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <Text style={tw`text-white font-bold text-sm`}>Ambil</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
});

AvailableWorkOrderListItem.displayName = 'AvailableWorkOrderListItem';

export default AvailableWorkOrderListItem;
