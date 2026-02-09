import { Badge } from '@/components/atoms/Badge';
import { formatDate } from '@/utils/date';
import { AlertCircle, Clock, MapPin, Phone } from 'lucide-react-native';
import React, { memo } from 'react';
import { Text, TouchableOpacity, View, Linking } from 'react-native';
import tw from 'twrnc';

export interface WorkOrderListItemProps {
    item: {
        id: string;
        workOrderNumber: string;
        status: string;
        title: string;
        priority: string;
        contactPhone?: string | null;
        contactName?: string | null;
        locationAddress?: string | null;
        scheduledDate?: string | null;
        assignments?: {
            userId: string;
            role: string;
            status: string;
        }[];
        pelanggan?: {
            noTelp?: string | null;
            alamat?: string | null;
            nama?: string | null;
        };
        site?: {
            name?: string | null;
        };
    };
    userId?: string;
}

// Move helper functions outside component to prevent recreation
const getStatusVariant = (status: string, isPendingPartner: boolean) => {
    if (isPendingPartner) return 'warning';

    switch (status) {
        case 'ASSIGNED': return 'info';
        case 'IN_PROGRESS': return 'warning';
        case 'COMPLETED': return 'success';
        case 'PENDING': return 'neutral';
        case 'CANCELLED': return 'error';
        default: return 'neutral';
    }
};

const getStatusText = (status: string, isPendingPartner: boolean) => {
    if (isPendingPartner) return 'Undangan';
    return status;
}

const getPriorityColor = (priority: string) => {
    if (priority === 'URGENT' || priority === 'CRITICAL') return 'text-red-600';
    if (priority === 'HIGH') return 'text-orange-500';
    return 'text-gray-500';
};

// Memoized sub-components to prevent re-renders
const PhoneButton = memo(({ phone }: { phone?: string | null }) => {
    if (!phone) return null;

    const handlePress = () => {
        let formattedPhone = phone.replace(/\D/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '62' + formattedPhone.substring(1);
        }

        Linking.openURL(`whatsapp://send?phone=${formattedPhone}`)
            .catch(() => {
                Linking.openURL(`tel:${phone}`);
            });
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            style={tw`flex-row items-center mb-1`}
        >
            <Phone size={14} color="#2563eb" style={tw`mr-1.5`} />
            <Text style={tw`text-sm text-blue-600 flex-1`} numberOfLines={1}>
                {phone}
            </Text>
        </TouchableOpacity>
    );
});
PhoneButton.displayName = 'PhoneButton';

const AddressButton = memo(({ address }: { address?: string | null }) => {
    if (!address) return null;

    const handlePress = () => {
        const query = encodeURIComponent(address);
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            style={tw`flex-row items-center mb-1`}
        >
            <MapPin size={14} color="#6b7280" style={tw`mr-1.5`} />
            <Text style={tw`text-sm text-gray-600 flex-1`} numberOfLines={1}>
                {address}
            </Text>
        </TouchableOpacity>
    );
});
AddressButton.displayName = 'AddressButton';

const WorkOrderListItem = memo(({ item, userId }: WorkOrderListItemProps) => {
    // Check if I am a partner with PENDING status
    const myAssignment = item.assignments?.find((a) => a.userId === userId);
    const isPendingPartner = myAssignment?.role === 'PARTNER' && myAssignment?.status === 'PENDING';

    const statusVariant = getStatusVariant(item.status, isPendingPartner);
    const statusText = getStatusText(item.status, isPendingPartner);
    const priorityColor = getPriorityColor(item.priority);

    const contactPhone = item.contactPhone || item.pelanggan?.noTelp;
    const address = item.locationAddress || item.pelanggan?.alamat || item.contactName || item.pelanggan?.nama || item.site?.name;

    return (
        <View style={tw`bg-white p-4 rounded-xl shadow-sm mb-3 border ${isPendingPartner ? 'border-yellow-200 bg-yellow-50' : 'border-gray-100'}`}>
            {/* Header: Number & Status */}
            <View style={tw`flex-row justify-between items-center mb-2`}>
                <Text style={tw`font-bold text-gray-800`}>{item.workOrderNumber}</Text>
                <Badge
                    label={statusText}
                    variant={statusVariant}
                />
            </View>

            {/* Title & Priority */}
            <Text style={tw`text-base font-semibold text-gray-900 mb-1`} numberOfLines={1}>
                {item.title}
            </Text>
            <View style={tw`flex-row items-center mb-3`}>
                <AlertCircle size={12} style={tw`${priorityColor} mr-1`} />
                <Text style={tw`text-xs ${priorityColor} font-medium`}>
                    {item.priority}
                </Text>
            </View>

            {/* Phone */}
            <PhoneButton phone={contactPhone} />

            {/* Customer & Location */}
            <AddressButton address={address} />

            {/* Date */}
            {item.scheduledDate && (
                <View style={tw`flex-row items-center mt-1`}>
                    <Clock size={14} color="#9ca3af" style={tw`mr-1.5`} />
                    <Text style={tw`text-xs text-gray-500`}>
                        {formatDate(item.scheduledDate, 'd MMM yyyy, HH:mm')}
                    </Text>
                </View>
            )}

            {isPendingPartner && (
                <View style={tw`mt-3 pt-2 border-t border-yellow-200`}>
                    <Text style={tw`text-xs text-yellow-700 font-bold text-center`}>
                        Menunggu Konfirmasi Anda
                    </Text>
                </View>
            )}
        </View>
    );
});

WorkOrderListItem.displayName = 'WorkOrderListItem';

export { WorkOrderListItem };
export default WorkOrderListItem;
