import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { ArrowLeft, Search, Ticket, CheckCircle, Clock, AlertCircle, XCircle, Plus, ChevronDown, X, User } from 'lucide-react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/id';

dayjs.extend(relativeTime);
dayjs.locale('id');

interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED';
  updatedAt: string;
  category: string;
  _count: {
    replies: number;
  };
}

const fetchTickets = async () => {
  const res = await api.get('/api/customer/tickets?limit=50');
  return res.data.tickets as SupportTicket[];
};

export default function CustomerTicketsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const { data: tickets, isLoading, refetch } = useQuery({
    queryKey: ['customer-tickets'],
    queryFn: fetchTickets
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: { category: string, subject: string, description: string }) => {
      const res = await api.post('/api/customer/tickets', data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer-tickets'] });
      setShowCreateModal(false);
      setCategory('');
      setSubject('');
      setDescription('');
      Alert.alert('Berhasil', `Tiket #${data.ticket.ticketNumber} berhasil dibuat.`);
    },
    onError: (error: any) => {
      Alert.alert('Gagal', error.response?.data?.error || 'Gagal membuat tiket');
    }
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const filteredTickets = tickets?.filter(t => {
    const matchesSearch = t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.subject.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === 'ALL') return matchesSearch;
    if (filter === 'OPEN') return matchesSearch && ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER'].includes(t.status);
    if (filter === 'CLOSED') return matchesSearch && ['RESOLVED', 'CLOSED'].includes(t.status);
    return matchesSearch;
  }) || [];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'OPEN': return { label: 'Baru', color: 'text-blue-600', bg: 'bg-blue-100', icon: AlertCircle };
      case 'IN_PROGRESS': return { label: 'Proses', color: 'text-orange-600', bg: 'bg-orange-100', icon: Clock };
      case 'WAITING_CUSTOMER': return { label: 'Menunggu', color: 'text-purple-600', bg: 'bg-purple-100', icon: User };
      case 'RESOLVED': return { label: 'Selesai', color: 'text-teal-600', bg: 'bg-teal-100', icon: CheckCircle };
      case 'CLOSED': return { label: 'Ditutup', color: 'text-gray-600', bg: 'bg-gray-100', icon: XCircle };
      default: return { label: status, color: 'text-gray-600', bg: 'bg-gray-100', icon: AlertCircle };
    }
  };

  const handleCreateSubmit = () => {
    if (!category || !subject || !description) {
      Alert.alert('Peringatan', 'Mohon lengkapi semua field');
      return;
    }
    createTicketMutation.mutate({ category, subject, description });
  };

  const categories = [
    { label: 'Masalah Teknis', value: 'TECHNICAL' },
    { label: 'Tagihan & Pembayaran', value: 'BILLING' },
    { label: 'Akun Saya', value: 'ACCOUNT' },
    { label: 'Lainnya', value: 'OTHER' },
  ];

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
      {/* Header */}
      <View style={tw`bg-white px-4 py-3 border-b border-gray-100 flex-row items-center justify-between`}>
        <View style={tw`flex-row items-center`}>
          <TouchableOpacity onPress={() => router.back()} style={tw`mr-3`}>
            <ArrowLeft size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={tw`text-lg font-bold text-gray-900`}>Tiket Bantuan</Text>
        </View>
        <TouchableOpacity 
          onPress={() => setShowCreateModal(true)}
          style={tw`bg-teal-600 px-3 py-1.5 rounded-lg flex-row items-center`}
        >
          <Plus size={16} color="white" style={tw`mr-1`} />
          <Text style={tw`text-white font-bold text-xs`}>Buat Baru</Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filter */}
      <View style={tw`px-4 py-3 bg-white border-b border-gray-100`}>
        <View style={tw`flex-row items-center bg-gray-100 rounded-lg px-3 py-2 mb-3`}>
          <Search size={20} color="#9ca3af" />
          <TextInput
            style={tw`flex-1 ml-2 text-gray-900`}
            placeholder="Cari nomor tiket atau judul..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={tw`flex-row gap-2`}>
          {['ALL', 'OPEN', 'CLOSED'].map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f as any)}
              style={tw`px-4 py-1.5 rounded-full ${filter === f ? 'bg-teal-600' : 'bg-gray-100'}`}
            >
              <Text style={tw`text-xs font-bold ${filter === f ? 'text-white' : 'text-gray-600'}`}>
                {f === 'ALL' ? 'Semua' : f === 'OPEN' ? 'Aktif' : 'Selesai'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* List */}
      <ScrollView
        contentContainerStyle={tw`p-4 pb-20`}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor="#0d9488" />
        }
      >
        {filteredTickets.length === 0 ? (
          <View style={tw`items-center justify-center py-10`}>
            <Ticket size={48} color="#d1d5db" />
            <Text style={tw`text-gray-500 mt-4 text-center`}>Belum ada tiket bantuan</Text>
          </View>
        ) : (
          filteredTickets.map((ticket) => {
            const status = getStatusConfig(ticket.status);
            const StatusIcon = status.icon;
            
            return (
              <TouchableOpacity
                key={ticket.id}
                onPress={() => {
                    // Navigate to detail (placeholder for now)
                    Alert.alert('Info', 'Detail tiket akan segera hadir');
                }}
                style={tw`bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3`}
              >
                <View style={tw`flex-row justify-between items-start mb-2`}>
                  <View style={tw`flex-row items-center bg-gray-100 px-2 py-1 rounded`}>
                    <Text style={tw`text-xs font-mono font-bold text-gray-600`}>#{ticket.ticketNumber}</Text>
                  </View>
                  <View style={tw`flex-row items-center px-2 py-1 rounded-full ${status.bg}`}>
                    <StatusIcon size={12} style={tw`${status.color} mr-1`} />
                    <Text style={tw`text-xs font-bold ${status.color}`}>{status.label}</Text>
                  </View>
                </View>
                
                <Text style={tw`text-base font-bold text-gray-900 mb-1`} numberOfLines={1}>
                  {ticket.subject}
                </Text>
                
                <View style={tw`flex-row justify-between items-center mt-3`}>
                  <Text style={tw`text-xs text-gray-500`}>
                    Update: {dayjs(ticket.updatedAt).fromNow()}
                  </Text>
                  {ticket._count.replies > 0 && (
                    <View style={tw`flex-row items-center`}>
                      <View style={tw`bg-blue-100 w-5 h-5 rounded-full items-center justify-center mr-1`}>
                        <Text style={tw`text-[10px] font-bold text-blue-600`}>{ticket._count.replies}</Text>
                      </View>
                      <Text style={tw`text-xs text-gray-500`}>Balasan</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Create Ticket Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={tw`flex-1 bg-black/50 justify-end`}>
          <View style={tw`bg-white rounded-t-3xl h-[90%] w-full`}>
            <View style={tw`px-6 py-4 border-b border-gray-100 flex-row items-center justify-between`}>
              <Text style={tw`text-xl font-bold text-gray-900`}>Buat Tiket Baru</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)} style={tw`p-2 bg-gray-100 rounded-full`}>
                <X size={20} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={tw`p-6`}>
              {/* Category Dropdown */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-sm font-bold text-gray-700 mb-2`}>Kategori</Text>
                <TouchableOpacity
                  onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  style={tw`flex-row items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3`}
                >
                  <Text style={tw`${category ? 'text-gray-900' : 'text-gray-400'}`}>
                    {categories.find(c => c.value === category)?.label || 'Pilih Kategori'}
                  </Text>
                  <ChevronDown size={20} color="#9ca3af" />
                </TouchableOpacity>
                
                {showCategoryDropdown && (
                  <View style={tw`mt-1 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden`}>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.value}
                        onPress={() => {
                          setCategory(cat.value);
                          setShowCategoryDropdown(false);
                        }}
                        style={tw`px-4 py-3 border-b border-gray-50 active:bg-teal-50`}
                      >
                        <Text style={tw`text-gray-700`}>{cat.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={tw`mb-4`}>
                <Text style={tw`text-sm font-bold text-gray-700 mb-2`}>Judul</Text>
                <TextInput
                  value={subject}
                  onChangeText={setSubject}
                  placeholder="Contoh: Internet Mati Total"
                  style={tw`bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900`}
                />
              </View>

              <View style={tw`mb-6`}>
                <Text style={tw`text-sm font-bold text-gray-700 mb-2`}>Deskripsi</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Jelaskan masalah Anda secara detail..."
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  style={tw`bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 h-32`}
                />
              </View>

              <TouchableOpacity
                onPress={handleCreateSubmit}
                disabled={createTicketMutation.isPending}
                style={tw`bg-teal-600 py-4 rounded-xl items-center shadow-lg shadow-teal-900/20 ${createTicketMutation.isPending ? 'opacity-70' : ''}`}
              >
                {createTicketMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={tw`text-white font-bold text-base`}>Kirim Tiket</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
