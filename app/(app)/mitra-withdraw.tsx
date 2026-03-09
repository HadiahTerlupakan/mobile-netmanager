import api from '@/services/api';
import { presentAppError, presentErrorMessage, presentInfoMessage, presentSuccessMessage } from '@/utils/errorPresenter';
import { useRouter } from 'expo-router';
import {
    ArrowLeft,
    ArrowUpCircle,
    Banknote,
    CheckCircle,
    Clock,
    CreditCard,
    Send,
    XCircle,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

interface WithdrawData {
    bankInfo: {
        bankName: string | null;
        accountNo: string | null;
        accountName: string | null;
    };
    withdrawals: Withdrawal[];
    total: number;
}

interface Withdrawal {
    id: string;
    amount: number;
    method: 'TRANSFER' | 'CASH';
    bankName: string | null;
    accountNumber: string | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'PROCESSING';
    rejectionReason: string | null;
    createdAt: string;
    processedAt: string | null;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(amount);
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    PENDING: { label: 'Menunggu', color: 'text-amber-600', icon: Clock },
    APPROVED: { label: 'Disetujui', color: 'text-blue-600', icon: CheckCircle },
    PROCESSING: { label: 'Diproses', color: 'text-indigo-600', icon: Clock },
    COMPLETED: { label: 'Selesai', color: 'text-green-600', icon: CheckCircle },
    REJECTED: { label: 'Ditolak', color: 'text-red-600', icon: XCircle },
};

export default function MitraWithdrawScreen() {
    const router = useRouter();
    const [data, setData] = useState<WithdrawData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState<'TRANSFER' | 'CASH'>('TRANSFER');
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');
    const [notes, setNotes] = useState('');

    const fetchData = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            const res = await api.get('/api/mobile/mitra/withdraw');
            setData(res.data.data);

            // Pre-fill bank info
            if (res.data.data.bankInfo) {
                setBankName(res.data.data.bankInfo.bankName || '');
                setAccountNumber(res.data.data.bankInfo.accountNo || '');
                setAccountName(res.data.data.bankInfo.accountName || '');
            }
        } catch (error) {
            console.error('Error fetching withdrawals:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSubmit = async () => {
        const numAmount = parseFloat(amount);
        if (!numAmount || numAmount <= 0) {
            presentInfoMessage('Masukkan jumlah penarikan yang valid', 'Error');
            return;
        }

        if (method === 'TRANSFER' && (!bankName || !accountNumber)) {
            presentInfoMessage('Untuk transfer, nama bank dan nomor rekening harus diisi', 'Error');
            return;
        }

        Alert.alert(
            'Konfirmasi Penarikan',
            `Apakah Anda yakin ingin menarik ${formatCurrency(numAmount)} via ${method === 'TRANSFER' ? 'Transfer Bank' : 'Cash'}?`,
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Ya, Tarik',
                    onPress: async () => {
                        setSubmitting(true);
                        try {
                            await api.post('/api/mobile/mitra/withdraw', {
                                amount: numAmount,
                                method,
                                bankName: method === 'TRANSFER' ? bankName : undefined,
                                accountNumber: method === 'TRANSFER' ? accountNumber : undefined,
                                accountName: method === 'TRANSFER' ? accountName : undefined,
                                notes: notes || undefined,
                            });
                            presentSuccessMessage('Permintaan penarikan berhasil dibuat');
                            setShowForm(false);
                            setAmount('');
                            setNotes('');
                            fetchData();
                        } catch (error: any) {
                            const msg = error?.response?.data?.error || 'Gagal membuat permintaan';
                            if (msg === 'Gagal membuat permintaan') {
                                presentAppError(error, {
                                    screen: 'MitraWithdrawScreen',
                                    route: '/(app)/mitra-withdraw',
                                    fallbackTitle: 'Error',
                                });
                            } else {
                                presentErrorMessage(msg, 'Error');
                            }
                        } finally {
                            setSubmitting(false);
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={tw`flex-1 bg-gray-50 items-center justify-center`}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={tw`text-gray-500 mt-3`}>Memuat data...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
            <KeyboardAvoidingView
                style={tw`flex-1`}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} />}
                    contentContainerStyle={tw`pb-6`}
                >
                    {/* Header */}
                    <View style={tw`px-5 pt-4 pb-4 bg-white flex-row items-center gap-3`}>
                        <TouchableOpacity onPress={() => router.back()} style={tw`p-1`}>
                            <ArrowLeft size={24} color="#111827" />
                        </TouchableOpacity>
                        <View>
                            <Text style={tw`text-xl font-bold text-gray-900`}>Penarikan Komisi</Text>
                            <Text style={tw`text-sm text-gray-500`}>Tarik saldo ke rekening Anda</Text>
                        </View>
                    </View>

                    {/* New Withdraw Toggle */}
                    {!showForm && (
                        <View style={tw`mx-4 mt-4`}>
                            <TouchableOpacity
                                style={tw`bg-green-600 rounded-xl py-3.5 flex-row items-center justify-center shadow-sm`}
                                onPress={() => setShowForm(true)}
                            >
                                <Send size={20} color="white" />
                                <Text style={tw`text-white font-bold ml-2 text-base`}>Buat Penarikan Baru</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Withdraw Form */}
                    {showForm && (
                        <View style={tw`mx-4 mt-4 bg-white rounded-xl p-5 shadow-sm`}>
                            <Text style={tw`text-lg font-bold text-gray-900 mb-4`}>Formulir Penarikan</Text>

                            {/* Amount */}
                            <View style={tw`mb-4`}>
                                <Text style={tw`text-sm font-medium text-gray-700 mb-1`}>Jumlah (Rp) *</Text>
                                <TextInput
                                    value={amount}
                                    onChangeText={setAmount}
                                    keyboardType="numeric"
                                    placeholder="100000"
                                    style={tw`border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900 bg-gray-50`}
                                />
                            </View>

                            {/* Method */}
                            <View style={tw`mb-4`}>
                                <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Metode *</Text>
                                <View style={tw`flex-row gap-3`}>
                                    <TouchableOpacity
                                        onPress={() => setMethod('TRANSFER')}
                                        style={tw`flex-1 flex-row items-center justify-center py-3 rounded-lg border-2 ${method === 'TRANSFER' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'
                                            }`}
                                    >
                                        <CreditCard size={18} color={method === 'TRANSFER' ? '#2563eb' : '#9ca3af'} />
                                        <Text style={tw`ml-2 font-medium ${method === 'TRANSFER' ? 'text-blue-600' : 'text-gray-500'}`}>
                                            Transfer
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setMethod('CASH')}
                                        style={tw`flex-1 flex-row items-center justify-center py-3 rounded-lg border-2 ${method === 'CASH' ? 'border-green-600 bg-green-50' : 'border-gray-200 bg-white'
                                            }`}
                                    >
                                        <Banknote size={18} color={method === 'CASH' ? '#16a34a' : '#9ca3af'} />
                                        <Text style={tw`ml-2 font-medium ${method === 'CASH' ? 'text-green-600' : 'text-gray-500'}`}>
                                            Cash
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Bank Details (only for TRANSFER) */}
                            {method === 'TRANSFER' && (
                                <>
                                    <View style={tw`mb-3`}>
                                        <Text style={tw`text-sm font-medium text-gray-700 mb-1`}>Nama Bank *</Text>
                                        <TextInput
                                            value={bankName}
                                            onChangeText={setBankName}
                                            placeholder="BCA, BNI, Mandiri..."
                                            style={tw`border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900 bg-gray-50`}
                                        />
                                    </View>
                                    <View style={tw`mb-3`}>
                                        <Text style={tw`text-sm font-medium text-gray-700 mb-1`}>No. Rekening *</Text>
                                        <TextInput
                                            value={accountNumber}
                                            onChangeText={setAccountNumber}
                                            keyboardType="numeric"
                                            placeholder="1234567890"
                                            style={tw`border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900 bg-gray-50`}
                                        />
                                    </View>
                                    <View style={tw`mb-3`}>
                                        <Text style={tw`text-sm font-medium text-gray-700 mb-1`}>Nama Pemilik</Text>
                                        <TextInput
                                            value={accountName}
                                            onChangeText={setAccountName}
                                            placeholder="Nama sesuai rekening"
                                            style={tw`border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900 bg-gray-50`}
                                        />
                                    </View>
                                </>
                            )}

                            {/* Notes */}
                            <View style={tw`mb-4`}>
                                <Text style={tw`text-sm font-medium text-gray-700 mb-1`}>Catatan</Text>
                                <TextInput
                                    value={notes}
                                    onChangeText={setNotes}
                                    placeholder="Opsional"
                                    style={tw`border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900 bg-gray-50`}
                                />
                            </View>

                            {/* Actions */}
                            <View style={tw`flex-row gap-3`}>
                                <TouchableOpacity
                                    onPress={() => setShowForm(false)}
                                    style={tw`flex-1 py-3 rounded-lg border border-gray-300 items-center`}
                                >
                                    <Text style={tw`text-gray-700 font-medium`}>Batal</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleSubmit}
                                    disabled={submitting}
                                    style={tw`flex-1 py-3 rounded-lg bg-green-600 items-center ${submitting ? 'opacity-60' : ''}`}
                                >
                                    {submitting ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Text style={tw`text-white font-bold`}>Kirim</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Withdrawal History */}
                    <View style={tw`mx-4 mt-6`}>
                        <Text style={tw`text-lg font-bold text-gray-900 mb-3`}>Riwayat Penarikan</Text>

                        {(!data?.withdrawals || data.withdrawals.length === 0) ? (
                            <View style={tw`bg-white rounded-xl p-8 items-center`}>
                                <ArrowUpCircle size={40} color="#9ca3af" />
                                <Text style={tw`text-gray-400 mt-3 text-center`}>Belum ada penarikan</Text>
                            </View>
                        ) : (
                            <View style={tw`bg-white rounded-xl overflow-hidden`}>
                                {data.withdrawals.map((wd, index) => {
                                    const cfg = statusConfig[wd.status] || statusConfig.PENDING;
                                    const StatusIcon = cfg.icon;
                                    return (
                                        <View
                                            key={wd.id}
                                            style={tw`px-4 py-3 ${index < data.withdrawals.length - 1 ? 'border-b border-gray-100' : ''
                                                }`}
                                        >
                                            <View style={tw`flex-row items-center justify-between`}>
                                                <View style={tw`flex-row items-center gap-2`}>
                                                    <StatusIcon size={16} color={cfg.color.includes('green') ? '#16a34a' : cfg.color.includes('red') ? '#dc2626' : cfg.color.includes('amber') ? '#d97706' : '#2563eb'} />
                                                    <Text style={tw`text-sm font-bold text-gray-900`}>
                                                        {formatCurrency(wd.amount)}
                                                    </Text>
                                                </View>
                                                <Text style={tw`text-xs font-medium ${cfg.color}`}>{cfg.label}</Text>
                                            </View>
                                            <View style={tw`flex-row items-center justify-between mt-1`}>
                                                <Text style={tw`text-xs text-gray-500`}>
                                                    {wd.method === 'TRANSFER' ? `Transfer - ${wd.bankName}` : 'Cash'}
                                                </Text>
                                                <Text style={tw`text-xs text-gray-400`}>
                                                    {new Date(wd.createdAt).toLocaleDateString('id-ID', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                    })}
                                                </Text>
                                            </View>
                                            {wd.status === 'REJECTED' && wd.rejectionReason && (
                                                <Text style={tw`text-xs text-red-500 mt-1`}>
                                                    Alasan: {wd.rejectionReason}
                                                </Text>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
