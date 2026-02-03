import { Badge } from '@/components/atoms/Badge';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
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
        contactPhone?: string;
        contactName?: string;
        locationAddress?: string;
        scheduledDate?: string;
        assignments?: Array<{
            userId: string;
            role: string;
            status: string;
        }>;
        pelanggan?: {
            noTelp?: string;
            alamat?: string;
            nama?: string;
        };
        site?: {
            name?: string;
        };
    };
    userId?: string;
}

const WorkOrderListItem = memo(({ item, userId }: WorkOrderListItemProps) => {
    // Check if I am a partner with PENDING status
    const myAssignment = item.assignments?.find((a) => a.userId === userId);
    const isPendingPartner = myAssignment?.role === 'PARTNER' && myAssignment?.status === 'PENDING';

    const getStatusVariant = (status: string) => {
        if (isPendingPartner) return 'warning'; // Override for pending partner

        switch (status) {
            case 'ASSIGNED': return 'info';
            case 'IN_PROGRESS': return 'warning';
            case 'COMPLETED': return 'success';
            case 'PENDING': return 'neutral';
            case 'CANCELLED': return 'error';
            default: return 'neutral';
        }
    };

    const getStatusText = (status: string) => {
        if (isPendingPartner) return 'Undangan';
        return status;
    }

    const getPriorityColor = (priority: string) => {
        if (priority === 'URGENT' || priority === 'CRITICAL') return 'text-red-600';
        if (priority === 'HIGH') return 'text-orange-500';
        return 'text-gray-500';
    };

    const handlePhonePress = () => {
        const phone = item.contactPhone || item.pelanggan?.noTelp;
        if (phone) {
            let formattedPhone = phone.replace(/\D/g, '');
            if (formattedPhone.startsWith('0')) {
                formattedPhone = '62' + formattedPhone.substring(1);
            }

            Linking.openURL(`whatsapp://send?phone=${formattedPhone}`)
                .catch(() => {
                    Linking.openURL(`tel:${phone}`);
                });
        }
    };

    const handleAddressPress = () => {
        const address = item.locationAddress || item.pelanggan?.alamat || item.contactName || item.pelanggan?.nama || item.site?.name;
        if (address) {
            const query = encodeURIComponent(address);
            Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
        }
    };

    return (
        <View style={tw`bg-white p-4 rounded-xl shadow-sm mb-3 border ${isPendingPartner ? 'border-yellow-200 bg-yellow-50' : 'border-gray-100'}`}>
            {/* Header: Number & Status */}
            <View style={tw`flex-row justify-between items-center mb-2`}>
                <Text style={tw`font-bold text-gray-800`}>{item.workOrderNumber}</Text>
                <Badge
                    label={getStatusText(item.status)}
                    variant={getStatusVariant(item.status)}
                />
            </View>

            {/* Title & Priority */}
            <Text style={tw`text-base font-semibold text-gray-900 mb-1`} numberOfLines={1}>
                {item.title}
            </Text>
            <View style={tw`flex-row items-center mb-3`}>
                <AlertCircle size={12} style={tw`${getPriorityColor(item.priority)} mr-1`} />
                <Text style={tw`text-xs ${getPriorityColor(item.priority)} font-medium`}>
                    {item.priority}
                </Text>
            </View>

            {/* Phone */}
            {(item.contactPhone || item.pelanggan?.noTelp) && (
                <TouchableOpacity
                    onPress={handlePhonePress}
                    style={tw`flex-row items-center mb-1`}
                >
                    <Phone size={14} color="#2563eb" style={tw`mr-1.5`} />
                    <Text style={tw`text-sm text-blue-600 flex-1`} numberOfLines={1}>
                        {item.contactPhone || item.pelanggan?.noTelp}
                    </Text>
                </TouchableOpacity>
            )}

            {/* Customer & Location */}
            <TouchableOpacity
                onPress={handleAddressPress}
                style={tw`flex-row items-center mb-1`}
            >
                <MapPin size={14} color="#6b7280" style={tw`mr-1.5`} />
                <Text style={tw`text-sm text-gray-600 flex-1`} numberOfLines={1}>
                    {item.locationAddress || item.pelanggan?.alamat || item.contactName || item.pelanggan?.nama || item.site?.name || '-'}
                </Text>
            </TouchableOpacity>

            {/* Date */}
            {item.scheduledDate && (
                <View style={tw`flex-row items-center mt-1`}>
                    <Clock size={14} color="#9ca3af" style={tw`mr-1.5`} />
                    <Text style={tw`text-xs text-gray-500`}>
                        {format(new Date(item.scheduledDate), 'd MMM yyyy, HH:mm', { locale: id })}
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

export default WorkOrderListItem;
