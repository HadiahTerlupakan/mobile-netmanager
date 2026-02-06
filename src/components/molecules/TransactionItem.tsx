import { Ionicons } from '@expo/vector-icons';
import React, { ComponentProps } from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface Transaction {
    id: string;
    type: 'masuk' | 'keluar';
    barang: {
        kode: string;
        nama: string;
        satuan: string;
    };
    gudang: {
        nama: string;
    };
    jumlah: number;
    kondisi: string;
    keterangan: string | null;
    tanggal: string;
}

interface TransactionItemProps {
    item: Transaction;
    formatDate: (dateString: string) => string;
}

const getStatusColor = (type: 'masuk' | 'keluar') => {
    return type === 'masuk' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
};

const getIcon = (type: 'masuk' | 'keluar'): IoniconName => {
    return type === 'masuk' ? 'arrow-down-circle' : 'arrow-up-circle';
};

const TransactionItem = React.memo(({ item, formatDate }: TransactionItemProps) => {
    return (
        <View style={tw`bg-white p-4 rounded-xl border border-gray-100 mb-3 shadow-sm`}>
            <View style={tw`flex-row justify-between items-start mb-2`}>
                <View style={tw`flex-row items-center gap-2 flex-1`}>
                    <View style={tw`p-2 rounded-full ${item.type === 'masuk' ? 'bg-green-50' : 'bg-red-50'}`}>
                        <Ionicons
                            name={getIcon(item.type)}
                            size={20}
                            color={item.type === 'masuk' ? '#16A34A' : '#DC2626'}
                        />
                    </View>
                    <View style={tw`flex-1`}>
                        <Text style={tw`font-bold text-gray-900 text-base`} numberOfLines={1}>
                            {item.barang.nama}
                        </Text>
                        <Text style={tw`text-xs text-gray-500 font-medium`}>
                            {item.barang.kode}
                        </Text>
                    </View>
                </View>
                <View style={tw`px-2 py-1 rounded-full ${getStatusColor(item.type)}`}>
                    <Text style={tw`text-xs font-bold capitalize`}>
                        {item.type}
                    </Text>
                </View>
            </View>

            <View style={tw`flex-row justify-between items-end mt-2 pt-2 border-t border-gray-50`}>
                <View style={tw`flex-1`}>
                    <View style={tw`flex-row items-center gap-1 mb-1`}>
                        <Ionicons name="business-outline" size={12} color="#6B7280" />
                        <Text style={tw`text-xs text-gray-500`}>{item.gudang.nama}</Text>
                    </View>
                    <View style={tw`flex-row items-center gap-1`}>
                        <Ionicons name="time-outline" size={12} color="#6B7280" />
                        <Text style={tw`text-xs text-gray-500`}>{formatDate(item.tanggal)}</Text>
                    </View>
                </View>
                <View style={tw`items-end`}>
                    <Text style={tw`text-lg font-bold text-gray-900`}>
                        {item.jumlah} <Text style={tw`text-sm font-normal text-gray-500`}>{item.barang.satuan}</Text>
                    </Text>
                    {item.kondisi !== 'BARU' && (
                        <Text style={tw`text-xs text-orange-600 font-medium`}>{item.kondisi}</Text>
                    )}
                </View>
            </View>
        </View>
    );
});

TransactionItem.displayName = 'TransactionItem';

export default TransactionItem;
