import React from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import tw from 'twrnc';
import { CreditCard, Wallet, Calendar } from 'lucide-react-native';

interface BillCardProps {
  amount: number;
  status: 'PAID' | 'UNPAID';
  dueDate: string;
  invoiceNumber: string;
}

export function BillCard({ amount, status, dueDate, invoiceNumber }: BillCardProps) {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  return (
    <View style={tw`bg-blue-600 rounded-2xl p-5 shadow-md mb-4`}>
      <View style={tw`flex-row justify-between items-start mb-4`}>
        <View>
          <Text style={tw`text-blue-100 text-sm font-medium`}>Tagihan Bulan Ini</Text>
          <Text style={tw`text-white text-2xl font-bold mt-1`}>
            {formatCurrency(amount)}
          </Text>
        </View>
        <View style={tw`${status === 'PAID' ? 'bg-green-500' : 'bg-red-500'} px-3 py-1 rounded-full`}>
          <Text style={tw`text-white text-xs font-bold`}>
            {status === 'PAID' ? 'LUNAS' : 'BELUM BAYAR'}
          </Text>
        </View>
      </View>

      <View style={tw`flex-row items-center justify-between`}>
        <View style={tw`flex-row items-center`}>
          <Calendar size={16} color="#bfdbfe" />
          <Text style={tw`text-blue-100 text-xs ml-2`}>
            Jatuh Tempo: {dueDate}
          </Text>
        </View>
        <Text style={tw`text-blue-200 text-xs`}>
          {invoiceNumber}
        </Text>
      </View>

      {status === 'UNPAID' && (
        <TouchableOpacity style={tw`bg-white mt-4 py-3 rounded-xl items-center flex-row justify-center`}>
          <Wallet size={18} color="#2563eb" style={tw`mr-2`} />
          <Text style={tw`text-blue-600 font-bold`}>Bayar Sekarang</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
